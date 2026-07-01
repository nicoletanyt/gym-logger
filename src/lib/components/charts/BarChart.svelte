<script lang="ts">
    import { BarChart } from "layerchart";
    import { scaleBand } from "d3-scale";
    import * as Chart from "$lib/components/ui/chart/index.js";
    import * as Card from "$lib/components/ui/card/index.js";
    import { cubicInOut } from "svelte/easing";
    import ChartContainer from "../ui/chart/chart-container.svelte";

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

    console.log(chartData);

    const chartConfig = {
        [key]: { label, color: "var(--chart-1)" },
    } satisfies Chart.ChartConfig;

    console.log(chartConfig);
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
    </Card.Header>
    <Card.Content>
        <Chart.Container config={chartConfig}>
            <BarChart
                data={chartData}
                orientation="horizontal"
                yScale={scaleBand().padding(0.25)}
                {y}
                series={[
                    {
                        key,
                        label,
                        color: chartConfig[key].color,
                    },
                ]}
                padding={{ left: 20 }}
                grid={false}
                rule={false}
                axis="y"
                props={{
                    bars: {
                        stroke: "none",
                        radius: 5,
                        insets: {
                            left: 24,
                        },
                        rounded: "all",
                        motion: {
                            type: "tween",
                            duration: 500,
                            easing: cubicInOut,
                        },
                    },
                    highlight: { area: { fill: "none" } },
                    // yAxis: { format: (d) => d.slice(0, 3) },
                }}
            >
                {#snippet tooltip()}
                    <Chart.Tooltip hideLabel />
                {/snippet}
            </BarChart>
        </Chart.Container>
    </Card.Content>
</Card.Root>
