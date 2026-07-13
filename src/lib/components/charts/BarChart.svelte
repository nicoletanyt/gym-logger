<script lang="ts">
    import { BarChart } from "layerchart";
    import { scaleBand } from "d3-scale";
    import * as Chart from "$lib/components/ui/chart/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { cubicInOut } from "svelte/easing";
    import ChartContainer from "../ui/chart/chart-container.svelte";
    import { formatDuration } from "$lib/constants";

    type Props = {
        title?: string;
        description?: string;
        chartData: Record<string, unknown>[];
        label: string;
        key: string;
        y: string;
    };

    const {
        title = "Bar Chart",
        description = "",
        chartData,
        label,
        key,
        y,
    }: Props = $props();

    const chartConfig = {
        [key]: { label, color: "var(--chart-2)" },
    } satisfies Chart.ChartConfig;
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
    </Card.Header>
    <Card.Content>
        <Chart.Container config={chartConfig}>
            <BarChart
                height={120}
                labels={{ offset: 12 }}
                data={chartData}
                orientation="horizontal"
                yScale={scaleBand().padding(0.25)}
                {y}
                axis="y"
                rule={false}
                grid={false}
                series={[
                    {
                        key,
                        label,
                        color: chartConfig[key].color,
                    },
                ]}
                padding={{ right: 50 }}
                props={{
                    bars: {
                        stroke: "none",
                        radius: 5,
                        rounded: "all",
                        motion: {
                            type: "tween",
                            duration: 500,
                            easing: cubicInOut,
                        },
                    },
                    highlight: { area: { fill: "none" } },
                    yAxis: {
                        tickLabelProps: {
                            textAnchor: "start",
                            dx: 6,
                            class: "stroke-none fill-background!",
                        },
                        tickLength: 0,
                    },
                    labels: {
                        format: (value) => formatDuration(value),
                    },
                }}
            >
                {#snippet tooltip()}
                    <Chart.Tooltip hideLabel>
                        {#snippet formatter({ value, name })}
                            <div
                                class="flex w-full items-center text-center justify-between gap-1"
                            >
                                <span
                                    >{name}: {formatDuration(
                                        value as number,
                                    )}</span
                                >
                            </div>
                        {/snippet}
                    </Chart.Tooltip>
                {/snippet}
            </BarChart>
        </Chart.Container>
    </Card.Content>
</Card.Root>
