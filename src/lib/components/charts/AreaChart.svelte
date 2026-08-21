<script lang="ts">
    import { AreaChart } from "layerchart";
    import { scalePoint } from "d3-scale";
    import * as Chart from "$lib/components/ui/chart/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { cubicInOut } from "svelte/easing";

    type Props = {
        title?: string;
        description?: string;
        chartData: Record<string, unknown>[];
        label: string;
        key: string;
        x: string;
        y: string;
        format?: (value: number) => string;
    };

    const {
        title = "Area Chart",
        description = "",
        chartData,
        label,
        key,
        x,
        y,
        format = (value) => `${value}`,
    }: Props = $props();

    const chartConfig = $derived({
        [key]: { label, color: "var(--chart-2)" },
    } satisfies Chart.ChartConfig);
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
    </Card.Header>
    <Card.Content>
        <Chart.Container config={chartConfig}>
            <AreaChart
                height={160}
                data={chartData}
                x={x}
                y={y}
                xScale={scalePoint().padding(0.5)}
                series={[{ key, label, color: chartConfig[key].color }]}
                props={{
                    area: {
                        fillOpacity: 0.3,
                        motion: {
                            type: "tween",
                            duration: 500,
                            easing: cubicInOut,
                        },
                    },
                    line: {
                        motion: {
                            type: "tween",
                            duration: 500,
                            easing: cubicInOut,
                        },
                    },
                    highlight: { area: { fill: "none" } },
                    xAxis: {
                        tickLabelProps: {
                            textAnchor: "middle",
                            dx: 0,
                            class: "stroke-none fill-background!",
                        },
                        tickLength: 0,
                    },
                    labels: {
                        format: (value) => format(value as number),
                    },
                }}
            >
                {#snippet tooltip()}
                    <Chart.Tooltip hideLabel>
                        {#snippet formatter({ value, name })}
                            <div
                                class="flex w-full items-center text-center justify-between gap-1"
                            >
                                <span>{name}: {format(value as number)}</span>
                            </div>
                        {/snippet}
                    </Chart.Tooltip>
                {/snippet}
            </AreaChart>
        </Chart.Container>
    </Card.Content>
</Card.Root>