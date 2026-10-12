import {useCallback, useEffect, useState} from 'react'
import {Box, Button, Card, Flex, Stack, Switch, Text, TextInput} from '@sanity/ui'
import {AddIcon, CloseIcon, WarningOutlineIcon} from '@sanity/icons'
import {set, unset, type ArrayOfObjectsInputProps} from 'sanity'
import {
  WEEKDAYS,
  parseWeek,
  sameSlots,
  serializeWeek,
  type DayHours,
  type TimeRange,
  type Week,
} from '../lib/openingHours'

type StoredSlot = {days?: string; hours?: string}

/**
 * Öffnungszeiten als Woche: eine Zeile pro Tag, Schalter für Ruhetag,
 * Uhrzeiten zum Anklicken. Gespeichert wird das bisherige Zeilenformat.
 */
export function OpeningHoursInput(props: ArrayOfObjectsInputProps) {
  const value = props.value as StoredSlot[] | undefined
  const {onChange, readOnly} = props
  const [week, setWeek] = useState<Week | null>(() => parseWeek(value))

  // Von außen geändert (Rückgängig, zweites Fenster): neu einlesen. Die
  // eigenen Änderungen kommen gleichlautend zurück und bleiben stehen —
  // sonst verschwände eine halb eingetragene Zeit.
  useEffect(() => {
    setWeek((current) => (current && sameSlots(value, serializeWeek(current)) ? current : parseWeek(value)))
  }, [value])

  const update = useCallback(
    (next: Week) => {
      setWeek(next)
      const slots = serializeWeek(next)
      onChange(slots.length ? set(slots) : unset())
    },
    [onChange],
  )

  if (!week) {
    return (
      <Stack gap={3}>
        <Card padding={3} radius={2} tone="caution" border>
          <Flex gap={3} align="center">
            <Text size={2}>
              <WarningOutlineIcon />
            </Text>
            <Text size={1}>
              Diese Zeiten stehen in einer Form, die die Wochenansicht nicht sicher lesen kann (etwa
              „24 Stunden geöffnet“). Deshalb hier als Liste.
            </Text>
          </Flex>
        </Card>
        {props.renderDefault(props)}
      </Stack>
    )
  }

  const setDay = (index: number, day: DayHours) => update(week.map((d, i) => (i === index ? day : d)))

  return (
    <Card radius={2} border>
      {week.map((day, index) => (
        <DayRow
          key={WEEKDAYS[index]}
          label={WEEKDAYS[index]}
          day={day}
          first={index === 0}
          readOnly={Boolean(readOnly)}
          onChange={(next) => setDay(index, next)}
          onCopyPrevious={index > 0 ? () => setDay(index, cloneDay(week[index - 1])) : undefined}
        />
      ))}
    </Card>
  )
}

const cloneDay = (day: DayHours): DayHours => ({closed: day.closed, ranges: day.ranges.map((r) => ({...r}))})

function DayRow({
  label,
  day,
  first,
  readOnly,
  onChange,
  onCopyPrevious,
}: {
  label: string
  day: DayHours
  first: boolean
  readOnly: boolean
  onChange: (day: DayHours) => void
  onCopyPrevious?: () => void
}) {
  const setRange = (i: number, range: TimeRange) =>
    onChange({...day, ranges: day.ranges.map((r, j) => (j === i ? range : r))})

  return (
    <Flex
      align="flex-start"
      gap={3}
      padding={3}
      wrap="wrap"
      style={first ? undefined : {borderTop: '1px solid var(--card-border-color)'}}
    >
      <Flex align="center" gap={3} style={{width: 124, minHeight: 33}}>
        <Switch
          checked={!day.closed}
          disabled={readOnly}
          aria-label={`${label} geöffnet`}
          onChange={(e) => onChange({...day, closed: !e.currentTarget.checked})}
        />
        <Text size={1} weight="semibold">
          {label}
        </Text>
      </Flex>

      <Box flex={1} style={{minWidth: 236}}>
        {day.closed ? (
          <Flex align="center" style={{minHeight: 33}}>
            <Text size={1} muted>
              Ruhetag
            </Text>
          </Flex>
        ) : (
          <Stack gap={2}>
            {day.ranges.map((range, i) => (
              <Flex key={i} align="center" gap={2}>
                <TimeInput
                  label={`${label} ab`}
                  value={range.open}
                  readOnly={readOnly}
                  onChange={(open) => setRange(i, {...range, open})}
                />
                <Text size={1} muted>
                  –
                </Text>
                <TimeInput
                  label={`${label} bis`}
                  value={range.close}
                  readOnly={readOnly}
                  onChange={(close) => setRange(i, {...range, close})}
                />
                {i > 0 ? (
                  <Button
                    icon={CloseIcon}
                    mode="bleed"
                    fontSize={1}
                    padding={2}
                    title="Zweite Zeit entfernen"
                    disabled={readOnly}
                    onClick={() => onChange({...day, ranges: day.ranges.filter((_, j) => j !== i)})}
                  />
                ) : null}
              </Flex>
            ))}
          </Stack>
        )}
      </Box>

      <Flex gap={1} style={{minHeight: 33}} align="center">
        {!day.closed && day.ranges.length < 2 ? (
          <Button
            icon={AddIcon}
            mode="bleed"
            fontSize={1}
            padding={2}
            text="Pause"
            title="Zweite Öffnungszeit, z. B. nach der Mittagspause"
            disabled={readOnly}
            onClick={() => onChange({...day, ranges: [...day.ranges, {open: '', close: ''}]})}
          />
        ) : null}
        {onCopyPrevious ? (
          <Button mode="ghost" fontSize={1} padding={2} text="wie Vortag" disabled={readOnly} onClick={onCopyPrevious} />
        ) : null}
      </Flex>
    </Flex>
  )
}

function TimeInput({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string
  value: string
  readOnly: boolean
  onChange: (value: string) => void
}) {
  return (
    <Box style={{width: 104}}>
      <TextInput
        type="time"
        fontSize={1}
        padding={2}
        aria-label={label}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    </Box>
  )
}
