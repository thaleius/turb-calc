<script lang="ts">
  import Display from "./Display.svelte";

  let {
    fr = $bindable(),
    frv = $bindable(),
    output = $bindable(),
    frEdit = $bindable(),
    frvEdit = $bindable(),
    outEdit = $bindable(),
    onEdit
  }: {
    fr: number,
    frv: number,
    output: number,
    frEdit: boolean,
    frvEdit: boolean,
    outEdit: boolean,
    onEdit?: () => void
  } = $props();
</script>

<div class="flex flex-col gap-y-1">
  <Display onEdit={onEdit} name="Flow Rate Valve" bind:value={frv} bind:edit={frvEdit} decimals={1} unit="%" inputClass="w-16" compact={true} />
  <Display onEdit={onEdit} name="Flow Rate" bind:value={fr} bind:edit={frEdit} decimals={2} unit="m³/s" inputClass="w-16" compact={true} />
  <Display onEdit={onEdit} name="Power Output" bind:value={output} bind:edit={outEdit} decimals={1} unit="kW" inputClass="w-26" compact={true} />
</div>