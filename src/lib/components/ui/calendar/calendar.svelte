<script lang="ts">
    import { Calendar as CalendarPrimitive } from "bits-ui";
    import * as Calendar from "./index.js";
    import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
    import type { ButtonVariant } from "../button/button.svelte";
    import { isEqualMonth, type DateValue } from "@internationalized/date";
    import type { Snippet } from "svelte";
    import type { Session } from "$lib/types.js";
    import { INTENSITY_MAP } from "$lib/constants.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";

    let {
        ref = $bindable(null),
        value = $bindable(),
        placeholder = $bindable(),
        class: className,
        weekdayFormat = "short",
        buttonVariant = "ghost",
        captionLayout = "label",
        locale = "en-US",
        months: monthsProp,
        years,
        monthFormat: monthFormatProp,
        yearFormat = "numeric",
        day,
        disableDaysOutsideMonth = false,
        sessionData,
        ...restProps
    }: WithoutChildrenOrChild<CalendarPrimitive.RootProps> & {
        buttonVariant?: ButtonVariant;
        captionLayout?:
            | "dropdown"
            | "dropdown-months"
            | "dropdown-years"
            | "label";
        months?: CalendarPrimitive.MonthSelectProps["months"];
        years?: CalendarPrimitive.YearSelectProps["years"];
        monthFormat?: CalendarPrimitive.MonthSelectProps["monthFormat"];
        yearFormat?: CalendarPrimitive.YearSelectProps["yearFormat"];
        day?: Snippet<[{ day: DateValue; outsideMonth: boolean }]>;
        sessionData: Record<string, Session>;
    } = $props();

    const monthFormat = $derived.by(() => {
        if (monthFormatProp) return monthFormatProp;
        if (captionLayout.startsWith("dropdown")) return "short";
        return "long";
    });

    let selectedDate = $state<string>("");
    let selectedSession = $derived(sessionData[selectedDate] ?? null);

    function getLevel(effort: number): number {
        // maps the range from 1-4
        return Math.round((effort / 5) * 4);
    }
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->

<CalendarPrimitive.Root
    bind:value={value as never}
    bind:ref
    bind:placeholder
    {weekdayFormat}
    {disableDaysOutsideMonth}
    class={cn(
        "p-3 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(8)] bg-background group/calendar in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        className,
    )}
    {locale}
    {monthFormat}
    {yearFormat}
    {...restProps}
>
    {#snippet children({ months, weekdays })}
        <Calendar.Months>
            <Calendar.Nav>
                <Calendar.PrevButton variant={buttonVariant} />
                <Calendar.NextButton variant={buttonVariant} />
            </Calendar.Nav>
            {#each months as month, monthIndex (month)}
                <Calendar.Month>
                    <Calendar.Header>
                        <Calendar.Caption
                            {captionLayout}
                            months={monthsProp}
                            {monthFormat}
                            {years}
                            {yearFormat}
                            month={month.value}
                            bind:placeholder
                            {locale}
                            {monthIndex}
                        />
                    </Calendar.Header>
                    <Calendar.Grid class="items-center">
                        <Calendar.GridHead>
                            <Calendar.GridRow class="select-none">
                                {#each weekdays as weekday, i (i)}
                                    <Calendar.HeadCell>
                                        {weekday.slice(0, 2)}
                                    </Calendar.HeadCell>
                                {/each}
                            </Calendar.GridRow>
                        </Calendar.GridHead>
                        <Calendar.GridBody class="my-2">
                            {#each month.weeks as weekDates (weekDates)}
                                <Calendar.GridRow class="w-full">
                                    {#each weekDates as date (date)}
                                        <Calendar.Cell
                                            {date}
                                            month={month.value}
                                        >
                                            {#if day}
                                                {@render day({
                                                    day: date,
                                                    outsideMonth: !isEqualMonth(
                                                        date,
                                                        month.value,
                                                    ),
                                                })}
                                            {:else}
                                                <Popover.Root>
                                                    <Popover.Trigger>
                                                        <Calendar.Day
                                                            class={INTENSITY_MAP[
                                                                getLevel(
                                                                    sessionData[
                                                                        date.toString()
                                                                    ]?.effort ??
                                                                        0,
                                                                )
                                                            ]}
                                                            onclick={() => {
                                                                selectedDate =
                                                                    date.toString();
                                                            }}
                                                        />
                                                    </Popover.Trigger>

                                                    <Popover.Content>
                                                        <!-- <Dialog.Header> -->
                                                        <!--     <Dialog.Title>Sessions on {selectedDate}</Dialog.Title> -->
                                                        <!-- </Dialog.Header> -->

                                                        <p
                                                            class="font-extrabold text-lg"
                                                        >
                                                            Sessions on {selectedDate}
                                                        </p>

                                                        {#if selectedSession}
                                                            <div
                                                                class="space-y-1"
                                                            >
                                                                <p>
                                                                    Duration: {selectedSession.duration}
                                                                </p>
                                                                <p>
                                                                    Effort: {selectedSession.effort}
                                                                </p>

                                                                <div>
                                                                    <p
                                                                        class="font-bold"
                                                                    >
                                                                        Exercises:
                                                                    </p>
                                                                    {#each selectedSession.exercises as exercise}
                                                                        <p>
                                                                            {exercise.name}:
                                                                            {exercise.reps}
                                                                            reps,
                                                                            {exercise.sets}
                                                                            sets
                                                                        </p>
                                                                    {:else}
                                                                        <p>
                                                                            No
                                                                            exercise
                                                                            logged
                                                                        </p>
                                                                    {/each}
                                                                </div>
                                                            </div>
                                                        {:else}
                                                            <p>
                                                                No sessions
                                                                logged
                                                            </p>
                                                        {/if}
                                                    </Popover.Content>
                                                </Popover.Root>
                                            {/if}
                                        </Calendar.Cell>
                                    {/each}
                                </Calendar.GridRow>
                            {/each}
                        </Calendar.GridBody>
                    </Calendar.Grid>
                </Calendar.Month>
            {/each}
        </Calendar.Months>
    {/snippet}
</CalendarPrimitive.Root>
