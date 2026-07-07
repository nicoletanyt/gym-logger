<script lang="ts">
    import { Plus, Check, X, Trash2, Pencil } from "@lucide/svelte";
    import { v4 as uuidv4 } from "uuid";
    import * as Table from "$lib/components/ui/table/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { InputMode, RowType, type Group } from "$lib/types";
    import { DEFAULT_EXERCISE, DEFAULT_GROUP } from "$lib/constants";
    import Checkbox from "./ui/checkbox/checkbox.svelte";
    import type { Exercise } from "$lib/Exercise.svelte";

    let { exercises = $bindable<Exercise[]>(), canEdit = true } = $props();
    let groups = $state<Group[]>([]);

    let newExerciseData = $state<Exercise>(DEFAULT_EXERCISE);
    let newGroup = $state<Group>(DEFAULT_GROUP);

    let mode = $state<InputMode>(InputMode.None);
    let selectedRows = $state<string[]>([]);

    let isEditRowIndex = $state("");

    let rows = $derived([
        ...groups.flatMap((group) => [
            { type: RowType.GroupHeading, data: group },
            ...exercises
                .filter((e: Exercise) => e.groupId == group.id)
                .map((e: Exercise) => ({
                    type: RowType.ExerciseItem,
                    data: e,
                })),
        ]),
        ...exercises
            .filter((e: Exercise) => !e.groupId)
            .map((e: Exercise) => ({
                type: RowType.ExerciseItem,
                data: e,
            })),
    ]);

    function addExercise() {
        newExerciseData.id = uuidv4();
        exercises.push({ ...newExerciseData });
        newExerciseData = DEFAULT_EXERCISE;
    }

    function selectRow(index: string) {
        if (selectedRows.includes(index)) {
            selectedRows.splice(selectedRows.indexOf(index), 1);
        } else selectedRows.push(index);
    }

    function getSelectedExericses() {
        let ex: String[] = [];
        selectedRows.forEach((id) => {
            const e = exercises.find((e: Exercise) => e.id == id);
            ex.push(e.name);
        });
        return ex.join(", ");
    }

    function createGroup() {
        newGroup.id = uuidv4();
        selectedRows.forEach((index) => {
            const e = exercises.find((e: Exercise) => e.id == index);
            e.sets = newGroup.sets;
            e.groupId = newGroup.id;
        });
        selectedRows = [];
        groups.push(newGroup);
        newGroup = DEFAULT_GROUP;
    }

    function deleteExercises() {
        exercises = exercises.filter(
            (e: Exercise) => !selectedRows.includes(e.id),
        );
        selectedRows = [];

        groups = groups.filter((g: Group) =>
            exercises.some((e: Exercise) => e.groupId == g.id),
        );
    }

    $effect(() => {
        if (mode == InputMode.None) {
            selectedRows = [];
            isEditRowIndex = "";
        }
    });
</script>

<div>
    {#each exercises as exercise}
        <div>
            {exercise.name}
        </div>
    {/each}
</div>

<!-- <table.root> -->
<!--     <table.header> -->
<!--         <table.row> -->
<!--             {#if mode == inputmode.edittable} -->
<!--                 <table.head class="w-7"></table.head> -->
<!--             {/if} -->
<!--             <table.head>exercise</table.head> -->
<!--             <table.head class="w-1/4 text-center">sets</table.head> -->
<!--             <table.head class="w-1/4 text-center">reps</table.head> -->
<!--         </table.row> -->
<!--     </table.header> -->
<!--     <table.body> -->
<!--         {#each rows as { type, data: item }} -->
<!--             {#if type == rowtype.groupheading} -->
<!--                 <table.row> -->
<!--                     {#if mode == inputmode.edittable} -->
<!--                         <table.cell class="w-7"></table.cell> -->
<!--                     {/if} -->
<!--                     <table.cell class="font-bold">{item.name}</table.cell> -->
<!--                     <table.cell class="text-center">{item.sets}</table.cell> -->
<!--                     <table.cell class="text-center"></table.cell> -->
<!--                 </table.row> -->
<!--             {:else} -->
<!--                 <table.row -->
<!--                     onclick={() => selectrow(item.id)} -->
<!--                     class={item.groupid ? "bg-muted/50" : ""} -->
<!--                 > -->
<!--                     {#if mode == inputmode.edittable} -->
<!--                         <table.cell class="w-7"> -->
<!--                             <checkbox -->
<!--                                 checked={selectedrows.includes(item.id)} -->
<!--                             /> -->
<!--                         </table.cell> -->
<!--                     {/if} -->
<!--                     <table.cell -->
<!--                         class={item.groupid && mode == inputmode.none -->
<!--                             ? "pl-5" -->
<!--                             : ""} -->
<!--                     > -->
<!--                         {#if iseditrowindex == item.id} -->
<!--                             <input -->
<!--                                 autofocus -->
<!--                                 bind:value={item.name} -->
<!--                                 onclick={(e) => e.stoppropagation()} -->
<!--                             /> -->
<!--                         {:else} -->
<!--                             {item.name} -->
<!--                         {/if} -->
<!--                     </table.cell> -->
<!--                     <table.cell class="text-center"> -->
<!--                         {#if iseditrowindex == item.id} -->
<!--                             <input -->
<!--                                 bind:value={item.sets} -->
<!--                                 onclick={(e) => e.stoppropagation()} -->
<!--                             /> -->
<!--                         {:else if !item.groupid} -->
<!--                             {item.sets} -->
<!--                         {/if} -->
<!--                     </table.cell> -->
<!--                     <table.cell class="text-center"> -->
<!--                         {#if iseditrowindex == item.id} -->
<!--                             <input -->
<!--                                 bind:value={item.reps} -->
<!--                                 onclick={(e) => e.stoppropagation()} -->
<!--                             /> -->
<!--                         {:else} -->
<!--                             {item.reps} -->
<!--                         {/if} -->
<!--                     </table.cell> -->
<!--                 </table.row> -->
<!--             {/if} -->
<!--         {/each} -->
<!--         {#if mode == inputmode.new} -->
<!--             <table.row> -->
<!--                 <table.cell> -->
<!--                     <input bind:value={newexercisedata.name} /> -->
<!--                 </table.cell> -->
<!--                 <table.cell class="text-center"> -->
<!--                     <input type="number" bind:value={newexercisedata.sets} /> -->
<!--                 </table.cell> -->
<!--                 <table.cell class="text-center"> -->
<!--                     <input type="number" bind:value={newexercisedata.reps} /> -->
<!--                 </table.cell> -->
<!--             </table.row> -->
<!--         {/if} -->
<!--     </table.body> -->
<!-- </table.root> -->
<!---->
<!-- {#if canedit} -->
<!--     <div class="flex justify-end gap-2"> -->
<!--         {#if mode != inputmode.none} -->
<!--             {#if mode == inputmode.edittable} -->
<!--                 <div class="mr-auto gap-2 flex items-center"> -->
<!--                     {#if selectedrows.length > 0} -->
<!--                         <button -->
<!--                             variant="destructive" -->
<!--                             size="icon-sm" -->
<!--                             onclick={deleteexercises}><trash2 /></button -->
<!--                         > -->
<!--                     {/if} -->
<!--                     {#if selectedrows.length == 1} -->
<!--                         <button -->
<!--                             variant="outline" -->
<!--                             size="sm" -->
<!--                             onclick={() => { -->
<!--                                 mode = inputmode.editrow; -->
<!--                                 iseditrowindex = selectedrows[0]; -->
<!--                             }}>edit</button -->
<!--                         > -->
<!--                     {:else if selectedrows.length > 1} -->
<!--                         <dialog.root> -->
<!--                             <dialog.trigger -->
<!--                                 class={buttonvariants({ -->
<!--                                     variant: "outline", -->
<!--                                     size: "sm", -->
<!--                                 })}>group</dialog.trigger -->
<!--                             > -->
<!--                             <dialog.content> -->
<!--                                 <dialog.header> -->
<!--                                     <dialog.title>create group</dialog.title> -->
<!--                                     <dialog.description> -->
<!--                                         selected exercises: -->
<!--                                         <br /> -->
<!--                                         {getselectedexericses()} -->
<!--                                     </dialog.description> -->
<!--                                 </dialog.header> -->
<!--                                 <div class="space-y-5"> -->
<!--                                     <div class="flex justify-between"> -->
<!--                                         <label class="shrink-0" -->
<!--                                             >group name</label -->
<!--                                         > -->
<!--                                         <input -->
<!--                                             class="w-1/2" -->
<!--                                             bind:value={newgroup.name} -->
<!--                                         /> -->
<!--                                     </div> -->
<!--                                     <div class="flex justify-between"> -->
<!--                                         <label class="shrink-0">sets</label> -->
<!--                                         <input -->
<!--                                             type="number" -->
<!--                                             class="w-1/2" -->
<!--                                             bind:value={newgroup.sets} -->
<!--                                         /> -->
<!--                                     </div> -->
<!--                                 </div> -->
<!--                                 <dialog.footer class=""> -->
<!--                                     <dialog.close -->
<!--                                         class={buttonvariants({ -->
<!--                                             variant: "default", -->
<!--                                         })} -->
<!--                                         onclick={creategroup}>add</dialog.close -->
<!--                                     > -->
<!--                                 </dialog.footer> -->
<!--                             </dialog.content> -->
<!--                         </dialog.root> -->
<!--                     {/if} -->
<!--                 </div> -->
<!--             {/if} -->
<!--             <button -->
<!--                 variant="destructive" -->
<!--                 size="icon" -->
<!--                 onclick={() => { -->
<!--                     mode = inputmode.none; -->
<!--                 }} -->
<!--             > -->
<!--                 <x /> -->
<!--             </button> -->
<!--             <button -->
<!--                 variant="secondary" -->
<!--                 class="bg-green-300" -->
<!--                 size="icon" -->
<!--                 onclick={() => { -->
<!--                     if (mode == inputmode.new) { -->
<!--                         addexercise(); -->
<!--                     } -->
<!--                     mode = inputmode.none; -->
<!--                 }} -->
<!--             > -->
<!--                 <check /> -->
<!--             </button> -->
<!--         {:else} -->
<!--             {#if exercises.length > 0} -->
<!--                 <button -->
<!--                     variant="outline" -->
<!--                     onclick={() => { -->
<!--                         mode = inputmode.edittable; -->
<!--                     }} -->
<!--                 > -->
<!--                     <pencil /> -->
<!--                 </button> -->
<!--             {/if} -->
<!--             <button -->
<!--                 variant="secondary" -->
<!--                 onclick={() => { -->
<!--                     mode = inputmode.new; -->
<!--                 }} -->
<!--             > -->
<!--                 <plus /> -->
<!--             </button> -->
<!--         {/if} -->
<!--     </div> -->
<!-- {/if} -->
