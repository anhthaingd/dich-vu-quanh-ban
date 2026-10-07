import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { AuthService } from '../auth/auth.service.js';
import { AccountTransaction } from '../accounts/account-transaction.js';
import { readManagement, visibleSkills } from './partners.read.js';
import type { Create, Edit } from './partners.input.js';

type Actor = Awaited<ReturnType<AuthService['authenticate']>>;
export class PartnersService {
  private readonly transaction: AccountTransaction;
  constructor(
    private readonly pool: Pool,
    private readonly auth: AuthService
  ) {
    this.transaction = new AccountTransaction(pool, auth);
  }
  private async permission(db: PoolClient, actor: Actor, id: string) {
    const {
      rows: [p]
    } = await db.query(
      'SELECT id FROM partners WHERE id=$1 AND archived_at IS NULL FOR UPDATE',
      [id]
    );
    if (!p) throw new NotFoundException();
    const {
      rows: [member]
    } = await db.query(
      `SELECT id,is_owner FROM memberships WHERE partner_id=$1 AND user_id=$2 AND active FOR UPDATE`,
      [id, actor.user.id]
    );
    if (!member) throw new NotFoundException();
    if (
      !member.is_owner &&
      !(
        await db.query(
          `SELECT id FROM membership_grants WHERE membership_id=$1 AND permission='profile.manage' AND revoked_at IS NULL FOR SHARE`,
          [member.id]
        )
      ).rowCount
    )
      throw new ForbiddenException();
  }
  async management(header: string | undefined, id: string) {
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const actor = await this.auth.authenticate(header, db);
      await this.permission(db, actor, id);
      const value = await readManagement(db, id);
      await db.query('COMMIT');
      return value;
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    } finally {
      db.release();
    }
  }
  create(header: string | undefined, input: Create, key: string) {
    return this.transaction.run(
      header,
      'createPartner',
      key,
      input,
      async (db, actor) => {
        const {
          rows: [p]
        } = await db.query(
          'INSERT INTO partners(kind,name,bio) VALUES($1,$2,$3) RETURNING id',
          [input.kind, input.name, input.bio]
        );
        await db.query(
          'INSERT INTO memberships(partner_id,user_id,is_owner) VALUES($1,$2,true)',
          [p.id, actor.user.id]
        );
        await db.query(
          "INSERT INTO ledger_accounts(owner_partner_id,unit) VALUES($1,'VND')",
          [p.id]
        );
        return readManagement(db, p.id);
      },
      async (db, actor) => {
        if (!actor.user.phone_verified) throw new ForbiddenException();
        const {
          rows: [previous]
        } = await db.query(
          "SELECT resource_id,response_snapshot->>'id' AS id FROM idempotency_keys WHERE actor_id=$1 AND operation='createPartner' AND request_key=$2",
          [actor.user.id, key]
        );
        if (previous) await this.permission(db, actor, previous.id);
      }
    );
  }
  private async validProfile(db: PoolClient, id: string) {
    const {
      rows: [check]
    } = await db.query(
      `${visibleSkills}
      SELECT EXISTS(SELECT 1 FROM partner_skills WHERE partner_id=$1 AND active) AND
       NOT EXISTS(SELECT 1 FROM partner_skills ps WHERE ps.partner_id=$1 AND ps.active AND (
        NOT EXISTS(SELECT 1 FROM visible_skills s WHERE s.id=ps.skill_id) OR cardinality(ps.modes)=0 OR
        ('at_shop'=ANY(ps.modes) AND NOT EXISTS(SELECT 1 FROM partner_locations l WHERE l.partner_id=$1 AND l.active AND l.public)) OR
        (ps.modes && ARRAY['at_customer','custom']::text[] AND NOT EXISTS(SELECT 1 FROM service_areas a WHERE a.partner_id=$1 AND a.active AND a.center IS NOT NULL))
       )) AS valid`,
      [id]
    );
    if (!check.valid) throw new BadRequestException();
  }
  edit(header: string | undefined, id: string, input: Edit, key: string) {
    return this.transaction.run(
      header,
      `partner.${id}.${input.action}`,
      key,
      input,
      async (db) => {
        const {
          rows: [current]
        } = await db.query(
          'SELECT version,publication_status,moderation_status FROM partners WHERE id=$1',
          [id]
        );
        if (current.version !== input.expected_version)
          throw new ConflictException({ code: 'VERSION_CONFLICT' });
        switch (input.action) {
          case 'profile':
            await db.query(
              `UPDATE partners SET name=COALESCE($2,name),bio=COALESCE($3,bio),profile=profile || $4::jsonb WHERE id=$1`,
              [
                id,
                input.name ?? null,
                input.bio ?? null,
                JSON.stringify({
                  ...(input.phone === undefined ? {} : { phone: input.phone }),
                  ...(input.zalo === undefined ? {} : { zalo: input.zalo })
                })
              ]
            );
            break;
          case 'skills': {
            const ids = input.skills.map((s) => s.skill_id);
            const { rows } = await db.query(
              `${visibleSkills} SELECT id FROM visible_skills WHERE id=ANY($1::uuid[])`,
              [ids]
            );
            if (rows.length !== ids.length) throw new BadRequestException();
            await db.query(
              'UPDATE partner_skills SET active=false WHERE partner_id=$1',
              [id]
            );
            for (const s of input.skills)
              await db.query(
                `INSERT INTO partner_skills(partner_id,skill_id,modes,reference_labor,inspection_fee,travel_fee) VALUES($1,$2,$3,$4,$5,$6)
            ON CONFLICT(partner_id,skill_id) DO UPDATE SET modes=EXCLUDED.modes,reference_labor=EXCLUDED.reference_labor,inspection_fee=EXCLUDED.inspection_fee,travel_fee=EXCLUDED.travel_fee,active=true`,
                [
                  id,
                  s.skill_id,
                  s.modes,
                  s.reference_labor,
                  s.inspection_fee,
                  s.travel_fee
                ]
              );
            break;
          }
          case 'service-areas':
            await db.query(
              'UPDATE service_areas SET active=false WHERE partner_id=$1',
              [id]
            );
            for (const a of input.areas)
              await db.query(
                'INSERT INTO service_areas(partner_id,label,center,radius_m) VALUES($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326)::geography,$5)',
                [id, a.label, a.center.longitude, a.center.latitude, a.radius_m]
              );
            break;
          case 'locations':
            await db.query(
              'UPDATE partner_locations SET active=false WHERE partner_id=$1',
              [id]
            );
            for (const l of input.locations)
              await db.query(
                'INSERT INTO partner_locations(partner_id,address_text,point,public) VALUES($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326)::geography,$5)',
                [
                  id,
                  l.address.text,
                  l.address.point.longitude,
                  l.address.point.latitude,
                  l.public
                ]
              );
            break;
          case 'publication':
            if (
              input.publication_status === 'published' &&
              current.moderation_status !== 'active'
            )
              throw new ForbiddenException();
            await db.query(
              "UPDATE partners SET publication_status=$2,accepting_jobs=CASE WHEN $2='draft' THEN false ELSE accepting_jobs END WHERE id=$1",
              [id, input.publication_status]
            );
            break;
          case 'availability':
            if (
              input.accepting_jobs &&
              (current.publication_status !== 'published' ||
                current.moderation_status !== 'active')
            )
              throw new ForbiddenException();
            await db.query(
              'UPDATE partners SET accepting_jobs=$2 WHERE id=$1',
              [id, input.accepting_jobs]
            );
            break;
        }
        const {
          rows: [updated]
        } = await db.query(
          'SELECT publication_status FROM partners WHERE id=$1',
          [id]
        );
        if (
          updated.publication_status === 'published' &&
          !(input.action === 'availability' && !input.accepting_jobs)
        )
          await this.validProfile(db, id);
        await db.query('UPDATE partners SET version=version+1 WHERE id=$1', [
          id
        ]);
        return readManagement(db, id);
      },
      (db, actor) => this.permission(db, actor, id)
    );
  }
  async publicProfile(
    header: string | undefined,
    id: string,
    locale: 'vi' | 'en' | 'ja' = 'vi'
  ) {
    const actor = header ? await this.auth.authenticate(header) : null;
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const {
        rows: [p]
      } = await db.query(
        `SELECT id,name,kind,bio,verification_status,accepting_jobs,moderation_status,profile FROM partners
        WHERE id=$1 AND publication_status='published' AND archived_at IS NULL AND moderation_status<>'suspended'`,
        [id]
      );
      if (!p) throw new NotFoundException();
      const skills = (
        await db.query(
          `${visibleSkills} SELECT s.id,s.code,s.name_vi,s.translations,s.schema_version,s.form_schema,ps.modes,
        ARRAY(SELECT sc.category_id FROM skill_categories sc JOIN visible_categories c ON c.id=sc.category_id WHERE sc.skill_id=s.id ORDER BY sc.category_id) AS category_ids
        FROM visible_skills s JOIN partner_skills ps ON ps.skill_id=s.id WHERE ps.partner_id=$1 AND ps.active ORDER BY s.id`,
          [id]
        )
      ).rows;
      const addresses = (
        await db.query(
          `SELECT id,address_text AS text,json_build_object('latitude',ST_Y(point::geometry),'longitude',ST_X(point::geometry)) AS point FROM partner_locations
        WHERE partner_id=$1 AND public AND active ORDER BY created_at,id`,
          [id]
        )
      ).rows;
      const own = actor
        ? !!(
            await db.query(
              'SELECT 1 FROM memberships WHERE partner_id=$1 AND user_id=$2 AND active',
              [id, actor.user.id]
            )
          ).rowCount
        : false;
      const { profile, accepting_jobs, moderation_status, ...publicFields } = p;
      await db.query('COMMIT');
      return {
        ...publicFields,
        skills: skills.map(({ translations, modes: _modes, ...s }) => {
          void _modes;
          const translated = translations[locale];
          const use =
            locale !== 'vi' &&
            typeof translated === 'string' &&
            translated.trim().length > 0;
          return {
            ...s,
            name: use ? translated : s.name_vi,
            name_locale: use ? locale : 'vi'
          };
        }),
        public_addresses: addresses.map(({id: _id,...address})=>{void _id;return address;}),
        public_locations: addresses.map(({id,...address})=>({id,address})),
        service_modes: skills.map(s=>({skill_id:s.id,modes:s.modes})),
        contact: actor
          ? { phone: profile.phone ?? '', zalo: profile.zalo ?? '' }
          : null,
        can_hire:
          !!actor?.user.phone_verified &&
          !own &&
          accepting_jobs &&
          moderation_status === 'active' &&
          skills.length > 0,
        can_message: !!actor && !own
      };
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    } finally {
      db.release();
    }
  }
}
