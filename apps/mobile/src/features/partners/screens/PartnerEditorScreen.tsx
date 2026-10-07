import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Switch, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../app/navigation/routes';
import { AccountPage } from '../../accounts/components/AccountPage';
import { useAuth } from '../../../app/providers/AuthProvider';
import { useLocale } from '../../../app/providers/LocaleProvider';
import { useCatalogApi } from '../../../app/providers/AppProviders';
import { AppText } from '../../../components/ui/AppText';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PartnerEditor } from '../state/partner-editor';
import type { Kind, Partner, PartnerChange, PartnerSkill } from '../models';
import type { Category, Skill } from '../../catalog/models/catalog.types';
import {
  Coordinates,
  coordinateNumber,
  Options
} from '../components/PartnerFields';
import { theme } from '../../../theme/tokens';
export function PartnerEditorScreen({
  navigation,
  route
}: NativeStackScreenProps<RootStackParamList, 'PartnerEditor'>) {
  return (
    <AccountPage
      title="partners.title"
      back={() => navigation.goBack()}
      login={() => navigation.navigate('Account', { returnTo: 'Partners' })}
    >
      {(owner) => (
        <Editor
          key={`${owner}:${route.params.id ?? 'new'}`}
          owner={owner}
          id={route.params.id}
          preview={(id) => navigation.navigate('PartnerProfile', { id })}
        />
      )}
    </AccountPage>
  );
}
type AreaDraft = { label: string; lat: string; lng: string; radius: string };
type LocationDraft = {
  text: string;
  lat: string;
  lng: string;
  public: boolean;
};
function Editor({
  owner,
  id,
  preview
}: {
  owner: string;
  id?: string;
  preview: (id: string) => void;
}) {
  const { manager, state: auth } = useAuth(),
    { t, locale } = useLocale(),
    catalog = useCatalogApi();
  const editor = useMemo(
    () => new PartnerEditor(manager, owner, id),
    [manager, owner, id]
  );
  const state = useSyncExternalStore(
    editor.subscribe,
    editor.getSnapshot,
    editor.getSnapshot
  );
  const [kind, setKind] = useState<Kind>('solo'),
    [name, setName] = useState(''),
    [bio, setBio] = useState(''),
    [phone, setPhone] = useState(''),
    [zalo, setZalo] = useState('');
  const [skills, setSkills] = useState<PartnerSkill[]>([]),
    [areas, setAreas] = useState<AreaDraft[]>([]),
    [locations, setLocations] = useState<LocationDraft[]>([]);
  const [section, setSection] = useState<
    'profile' | 'skills' | 'areas' | 'locations'
  >('profile');
  const [categories, setCategories] = useState<Category[]>([]),
    [choices, setChoices] = useState<Skill[]>([]),
    [industry, setIndustry] = useState<string>(),
    [catalogError, setCatalogError] = useState(false),
    [catalogBusy, setCatalogBusy] = useState(false),
    [catalogAttempt, setCatalogAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  function fill(p: Partner) {
    setName(p.name);
    setBio(p.bio);
    setPhone(p.phone);
    setZalo(p.zalo);
    setSkills(p.skills);
    setAreas(
      p.areas.map((a) => ({
        label: a.label,
        lat: String(a.center.latitude),
        lng: String(a.center.longitude),
        radius: String(a.radius_m)
      }))
    );
    setLocations(
      p.locations.map((l) => ({
        text: l.address.text,
        lat: String(l.address.point.latitude),
        lng: String(l.address.point.longitude),
        public: l.public
      }))
    );
    setLoaded(true);
  }
  useEffect(() => {
    void editor.load();
  }, [editor]);
  useEffect(() => {
    if (state.value && !loaded) fill(state.value);
  }, [state.value, loaded]);
  useEffect(() => {
    const c = new AbortController();
    setCatalogError(false);
    setCatalogBusy(true);
    catalog
      .categories(undefined, c.signal, locale)
      .then(async (roots) => {
        if (c.signal.aborted) return;
        setCategories(roots);
        const all = await Promise.all(
          roots.map((r) => catalog.skills(r.id, c.signal, locale))
        );
        if (!c.signal.aborted)
          setChoices([...new Map(all.flat().map((s) => [s.id, s])).values()]);
      })
      .catch(() => {
        if (!c.signal.aborted) setCatalogError(true);
      })
      .finally(() => {
        if (!c.signal.aborted) setCatalogBusy(false);
      });
    return () => c.abort();
  }, [catalog, locale, catalogAttempt]);
  const blocked = state.busy || state.pending || auth.busy;
  const p = state.value;
  const save = (input: PartnerChange) => {
    if (p) void editor.edit({ ...input, expected_version: p.version });
  };
  const skillName = (s: PartnerSkill) =>
    choices.find((c) => c.id === s.skill_id)?.name ?? s.skill_id;
  const [categorySkills, setCategorySkills] = useState<string[]>([]);
  useEffect(() => {
    const c = new AbortController();
    setCategorySkills([]);
    if (industry)
      catalog
        .skills(industry, c.signal, locale)
        .then((v) => {
          if (!c.signal.aborted) setCategorySkills(v.map((s) => s.id));
        })
        .catch(() => {
          if (!c.signal.aborted) setCatalogError(true);
        });
    return () => c.abort();
  }, [catalog, industry, locale]);
  return (
    <>
      {state.error && (
        <AppText testID="partner-error" accessibilityRole="alert" tone="error">
          {t(
            state.error === 'VERSION_CONFLICT'
              ? 'accountTools.conflict'
              : state.error === 'VALIDATION'
                ? 'partners.invalid'
                : 'partners.error'
          )}
        </AppText>
      )}
      {state.saved && (
        <AppText testID="partner-saved" accessibilityLiveRegion="polite">
          {t('partners.saved')}
        </AppText>
      )}
      {state.pending && (
        <Card>
          <AppText>{t('partners.pending')}</AppText>
          <Button
            testID="partner-retry"
            label={t('common.retry')}
            disabled={state.busy || auth.busy}
            onPress={() => void editor.retry()}
          />
        </Card>
      )}
      {!p &&
        (!id ? (
          <Card>
            <Options
              values={['solo', 'shop', 'company']}
              value={kind}
              onChange={setKind}
              disabled={blocked}
              testID="partner-kind"
            />
            <Input
              testID="partner-name"
              label={t('partners.name')}
              value={name}
              onChangeText={setName}
              editable={!blocked}
            />
            {!auth.user?.phone_verified && (
              <AppText>{t('partners.verifyNeeded')}</AppText>
            )}
            <Button
              testID="partner-create"
              label={t('partners.create')}
              disabled={blocked || !name.trim() || !auth.user?.phone_verified}
              onPress={() => void editor.create({ kind, name })}
            />
          </Card>
        ) : (
          <Button
            label={t('common.retry')}
            loading={state.busy}
            disabled={state.pending}
            onPress={() => void editor.load()}
          />
        ))}
      {p && (
        <>
          <Card
            style={{
              borderTopWidth: 4,
              borderTopColor: p.accepting_jobs
                ? theme.colors.success
                : theme.colors.primary
            }}
          >
            <AppText variant="caption" tone="muted">
              {t(`partners.${p.kind}`)} ·{' '}
              {t(`partners.${p.publication_status}`)}
            </AppText>
            <AppText variant="card">{p.name}</AppText>
            <AppText variant="caption" tone="muted">
              {t('partners.availabilityTitle')}
            </AppText>
            <AppText
              testID="partner-availability-status"
              variant="section"
              style={{
                color: p.accepting_jobs
                  ? theme.colors.success
                  : theme.colors.text
              }}
            >
              {t(p.accepting_jobs ? 'partners.accepting' : 'partners.paused')}
            </AppText>
            <AppText tone="muted">
              {t(
                p.publication_status === 'draft'
                  ? 'partners.draftAvailabilityHint'
                  : p.accepting_jobs
                    ? 'partners.acceptingHint'
                    : 'partners.pausedHint'
              )}
            </AppText>
            <Button
              testID="partner-availability"
              label={t(
                p.accepting_jobs ? 'partners.disable' : 'partners.enable'
              )}
              disabled={
                blocked ||
                p.publication_status !== 'published' ||
                (p.moderation_status !== 'active' && !p.accepting_jobs)
              }
              onPress={() =>
                save({
                  action: 'availability',
                  accepting_jobs: !p.accepting_jobs
                })
              }
            />
            {p.publication_status === 'draft' && (
              <Button
                testID="partner-publication"
                label={t('partners.publish')}
                variant="secondary"
                disabled={blocked}
                onPress={() =>
                  save({
                    action: 'publication',
                    publication_status: 'published'
                  })
                }
              />
            )}
          </Card>
          <AppText variant="section">{t('partners.editDetails')}</AppText>
          <Options
            values={['profile', 'skills', 'areas', 'locations']}
            value={section}
            onChange={setSection}
            disabled={blocked}
            testID="partner-section"
            layout="sections"
          />
          {section === 'profile' && (
            <Card>
              <Input
                testID="partner-name"
                label={t('partners.name')}
                value={name}
                onChangeText={setName}
                editable={!blocked}
              />
              <Input
                label={t('partners.bio')}
                value={bio}
                onChangeText={setBio}
                editable={!blocked}
                multiline
              />
              <Input
                label={t('partners.phone')}
                value={phone}
                onChangeText={setPhone}
                editable={!blocked}
                keyboardType="phone-pad"
              />
              <Input
                label={t('partners.zalo')}
                value={zalo}
                onChangeText={setZalo}
                editable={!blocked}
              />
              <Button
                testID="partner-save-profile"
                label={t('partners.save')}
                disabled={blocked}
                onPress={() =>
                  save({ action: 'profile', name, bio, phone, zalo })
                }
              />
            </Card>
          )}
          {section === 'skills' && (
            <>
              <AppText>{t('partners.priceHint')}</AppText>
              {skills.map((s, i) => (
                <Card key={s.skill_id}>
                  <AppText variant="card">{skillName(s)}</AppText>
                  {(['at_shop', 'at_customer', 'custom'] as const).map(
                    (mode) => (
                      <View
                        key={mode}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: theme.spacing.md
                        }}
                      >
                        <Switch
                          testID={`skill-mode-${i}-${mode}`}
                          accessibilityLabel={t(`partners.${mode}`)}
                          value={s.modes.includes(mode)}
                          disabled={blocked}
                          onValueChange={(enabled) =>
                            setSkills((v) =>
                              v.map((a, j) =>
                                j === i
                                  ? {
                                      ...a,
                                      modes: enabled
                                        ? [...a.modes, mode]
                                        : a.modes.filter((m) => m !== mode)
                                    }
                                  : a
                              )
                            )
                          }
                        />
                        <AppText>{t(`partners.${mode}`)}</AppText>
                      </View>
                    )
                  )}
                  {(
                    ['reference_labor', 'inspection_fee', 'travel_fee'] as const
                  ).map((key, k) => (
                    <Input
                      key={key}
                      label={t(
                        (
                          [
                            'partners.labor',
                            'partners.inspection',
                            'partners.travel'
                          ] as const
                        )[k]
                      )}
                      value={s[key] ?? ''}
                      keyboardType="number-pad"
                      editable={!blocked}
                      onChangeText={(text) =>
                        setSkills((v) =>
                          v.map((a, j) =>
                            i === j ? { ...a, [key]: text || null } : a
                          )
                        )
                      }
                    />
                  ))}
                  <Button
                    label={t('partners.remove')}
                    variant="link"
                    disabled={blocked}
                    onPress={() =>
                      setSkills((v) => v.filter((_, j) => j !== i))
                    }
                  />
                </Card>
              ))}
              <Card>
                <AppText variant="card">{t('partners.chooseIndustry')}</AppText>
                {catalogError ? (
                  <>
                    <AppText>{t('catalog.error')}</AppText>
                    <Button
                      label={t('common.retry')}
                      onPress={() => setCatalogAttempt((v) => v + 1)}
                    />
                  </>
                ) : catalogBusy ? (
                  <AppText>{t('catalog.loading')}</AppText>
                ) : (
                  categories.map((c) => (
                    <Button
                      key={c.id}
                      label={c.name}
                      variant={industry === c.id ? 'primary' : 'secondary'}
                      disabled={blocked}
                      onPress={() => setIndustry(c.id)}
                    />
                  ))
                )}
                {choices
                  .filter(
                    (c) =>
                      categorySkills.includes(c.id) &&
                      !skills.some((s) => s.skill_id === c.id)
                  )
                  .map((s) => (
                    <Button
                      key={s.id}
                      testID={`partner-add-skill-${s.code}`}
                      label={s.name}
                      variant="link"
                      disabled={blocked}
                      onPress={() =>
                        setSkills((v) => [
                          ...v,
                          {
                            skill_id: s.id,
                            modes: ['at_customer'],
                            reference_labor: null,
                            inspection_fee: null,
                            travel_fee: null
                          }
                        ])
                      }
                    />
                  ))}
              </Card>
              <Button
                testID="partner-save-skills"
                label={t('partners.save')}
                disabled={blocked || catalogBusy || catalogError}
                onPress={() => save({ action: 'skills', skills })}
              />
            </>
          )}
          {section === 'areas' && (
            <>
              {areas.map((a, i) => (
                <Card key={i}>
                  <Input
                    label={t('partners.label')}
                    value={a.label}
                    editable={!blocked}
                    onChangeText={(label) =>
                      setAreas((v) =>
                        v.map((x, j) => (j === i ? { ...x, label } : x))
                      )
                    }
                  />
                  <Coordinates
                    prefix={`area-${i}`}
                    lat={a.lat}
                    lng={a.lng}
                    disabled={blocked}
                    change={(key, text) =>
                      setAreas((v) =>
                        v.map((x, j) => (j === i ? { ...x, [key]: text } : x))
                      )
                    }
                  />
                  <Input
                    testID={`area-${i}-radius`}
                    label={t('partners.radius')}
                    value={a.radius}
                    editable={!blocked}
                    keyboardType="number-pad"
                    onChangeText={(radius) =>
                      setAreas((v) =>
                        v.map((x, j) => (j === i ? { ...x, radius } : x))
                      )
                    }
                  />
                  <Button
                    label={t('partners.remove')}
                    variant="link"
                    disabled={blocked}
                    onPress={() => setAreas((v) => v.filter((_, j) => j !== i))}
                  />
                </Card>
              ))}
              <Button
                testID="partner-add-area"
                label={t('partners.addArea')}
                variant="secondary"
                disabled={blocked}
                onPress={() =>
                  setAreas((v) => [
                    ...v,
                    { label: '', lat: '', lng: '', radius: '10000' }
                  ])
                }
              />
              <Button
                testID="partner-save-areas"
                label={t('partners.save')}
                disabled={blocked}
                onPress={() =>
                  save({
                    action: 'service-areas',
                    areas: areas.map((a) => ({
                      label: a.label,
                      center: {
                        latitude: coordinateNumber(a.lat),
                        longitude: coordinateNumber(a.lng)
                      },
                      radius_m: coordinateNumber(a.radius),
                      boundary_geojson: null
                    }))
                  })
                }
              />
            </>
          )}
          {section === 'locations' && (
            <>
              {locations.map((l, i) => (
                <Card key={i}>
                  <Input
                    label={t('addresses.text')}
                    value={l.text}
                    editable={!blocked}
                    onChangeText={(text) =>
                      setLocations((v) =>
                        v.map((x, j) => (j === i ? { ...x, text } : x))
                      )
                    }
                  />
                  <Coordinates
                    prefix={`location-${i}`}
                    lat={l.lat}
                    lng={l.lng}
                    disabled={blocked}
                    change={(key, text) =>
                      setLocations((v) =>
                        v.map((x, j) => (j === i ? { ...x, [key]: text } : x))
                      )
                    }
                  />
                  <AppText>
                    {t(l.public ? 'partners.public' : 'partners.private')}
                  </AppText>
                  <Switch
                    accessibilityLabel={t('partners.public')}
                    value={l.public}
                    disabled={blocked}
                    onValueChange={(pub) =>
                      setLocations((v) =>
                        v.map((x, j) => (j === i ? { ...x, public: pub } : x))
                      )
                    }
                  />
                  <Button
                    label={t('partners.remove')}
                    disabled={blocked}
                    variant="link"
                    onPress={() =>
                      setLocations((v) => v.filter((_, j) => j !== i))
                    }
                  />
                </Card>
              ))}
              <Button
                testID="partner-add-location"
                label={t('partners.addLocation')}
                disabled={blocked}
                variant="secondary"
                onPress={() =>
                  setLocations((v) => [
                    ...v,
                    { text: '', lat: '', lng: '', public: true }
                  ])
                }
              />
              <Button
                testID="partner-save-locations"
                label={t('partners.save')}
                disabled={blocked}
                onPress={() =>
                  save({
                    action: 'locations',
                    locations: locations.map((l) => ({
                      address: {
                        text: l.text,
                        point: {
                          latitude: coordinateNumber(l.lat),
                          longitude: coordinateNumber(l.lng)
                        }
                      },
                      public: l.public
                    }))
                  })
                }
              />
            </>
          )}
          <Card>
            <AppText variant="card">{t('partners.visibilityTitle')}</AppText>
            <AppText tone="muted">
              {t(
                p.verification_status === 'verified'
                  ? 'partners.verified'
                  : 'partners.unverified'
              )}
            </AppText>
            <AppText tone="muted">{t('partners.publishHint')}</AppText>
            {p.publication_status === 'published' && (
              <>
                <Button
                  label={t('partners.preview')}
                  variant="secondary"
                  onPress={() => preview(p.id)}
                  disabled={blocked}
                />
                <Button
                  testID="partner-publication"
                  label={t('partners.unpublish')}
                  variant="link"
                  disabled={blocked}
                  onPress={() =>
                    save({ action: 'publication', publication_status: 'draft' })
                  }
                />
              </>
            )}
          </Card>
          <AppText variant="caption" tone="muted">
            {t('partners.reloadHint')}
          </AppText>
          <Button
            testID="partner-reload"
            label={t('partners.reload')}
            disabled={blocked}
            variant="secondary"
            onPress={() =>
              void editor.load().then(() => {
                const value = editor.getSnapshot().value;
                if (value && !editor.getSnapshot().error) fill(value);
              })
            }
          />
        </>
      )}
    </>
  );
}
