// The business timezone is Vietnam, independent of the device's timezone.
export function appointment(day: string, time: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        return null;
    const instant = Date.parse(`${day}T${time}:00+07:00`);
    if (!Number.isFinite(instant) || new Date(instant + 7 * 3600000).toISOString().slice(0, 16) !== `${day}T${time}`)
        return null;
    return new Date(instant).toISOString();
}
