<script lang="ts">
  import { page } from '$app/state';
  import Chart from '$lib/components/Chart.svelte';
  import Display from '$lib/components/Display.svelte';
  import { emptyCalc, Socket, type CalcResult } from '$lib/socket';
  import { Clipboard } from 'flowbite-svelte'
  import { PenSolid } from 'flowbite-svelte-icons'
  import LZString from 'lz-string';

  let audioUnlocked = $state(false);
  let inputUrl = $state('');
  let connectionStatus = $state(false);
  
  let socketUrl = $state(localStorage.getItem('socketUrl') ? localStorage.getItem('socketUrl')! : '');

  let authUrl = $state('');
  let socket = $derived(new Socket(socketUrl));
  let id = $state(localStorage.getItem('id'));
  let sessionCode = $state(sessionStorage.getItem('sessionCode') || '');
  let isOwner = $state(true);
  let isAuthed = $state(false);

  let scramTemp = $state(3120);

  let editScramTemp = $state(false);

  let props: CalcResult = $state(emptyCalc);

  let shareLink = $state('');
  let shareLinkCopied = $state(false);

  let userList: string[] = $state([]);

  async function loadData() {
    if (isOwner) {
      const res = await socket.io.emitWithAck('session', id, scramTemp, sessionCode);
      sessionCode = res.code;
      sessionStorage.setItem('sessionCode', sessionCode);

      currentSimTime = res.startTime;

      update();

      const json = {
        server: socketUrl,
        code: sessionCode
      }

      const url = new URL(window.location.origin + window.location.pathname);

      const jsonString = JSON.stringify(json);
      const compressed = LZString.compressToEncodedURIComponent(jsonString);
      url.searchParams.append('s', compressed);

      shareLink = url.toString();

      props = res.data;
    
      currentSimTime = startTime;
    } else {
      const res = await socket.io.emitWithAck('joinSession', localStorage.getItem('id'), sessionCode);
      props = res.data;
      currentSimTime = res.simTime.time;
      isPlaying = res.isPlaying;
      scramTemp = res.scramTemp;
    }
  }

  function connect() {
    socket.io.connect();

    socket.io.on('connect', async () => {
      connectionStatus = true;
      if (isOwner) {
        loadData();
      }
    });

    socket.io.emit('newAuth', id);

    socket.io.on('auth', ({ id, url }: {id: string, url: string }) => {
      localStorage.setItem('id', id);
      authUrl = url;

      if (shareData) {
        console.log(id)
        localStorage.setItem('share', shareData);
        window.location.href = authUrl;
      }
    });

    socket.io.on('authed', (success) => {
      isAuthed = true;
      editScramTemp = true;
      console.log('Authorized:', success);
    });

    socket.io.on('sessionUpdate', (data) => {
      if (data.data) props = data.data;
      if (data.scramTemp) scramTemp = data.scramTemp;
      currentSimTime = data.simTime.time;
      isPlaying = data.isPlaying;
    })

    socket.io.on('disconnect', () => {
      connectionStatus = false;
    });

    socket.io.on('userList', (users) => {userList = users; console.log(users)});

    return () => {
      socket.io.disconnect();
    };
  }

  let { meltdownTime, scramTime, startTime, endTime, endTemp, data } = $derived(props);

  let isPlaying = $state(false);
  // svelte-ignore state_referenced_locally
  let currentSimTime = $state(startTime);

  const update = () => {
    socket.io.emit('sessionUpdate', id, sessionCode, {
      scramTemp: scramTemp,
      isPlaying,
      simTime: {
        time: currentSimTime,
        at: Date.now()
      }
    });
  }
  
  const announcements = [
    [-10, "10 seconds: Insert control rods", false],
    [50/9-10, "10 seconds: Open feedwater valves", false],
    [50-10, "10 seconds: Activate all coolant systems", false],
  ]
  $effect(() => {
    announcements.push([scramTime-10, "10 seconds: scram", false]);
    if (meltdownTime === 50) {
      announcements.push([50-20, "Meltdown imminent, prepare to activate all coolant systems.", false]);
    } else {
      announcements.push([meltdownTime-10, "Meltdown imminent.", false]);
    }
  })

  let currentUtterance: SpeechSynthesisUtterance | null = null;

  function playAnnouncement(text: string) {
    if (!isOwner && !audioUnlocked) return;

    window.speechSynthesis.cancel();

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'en-GB';
    
    currentUtterance.onend = () => { currentUtterance = null; };

    window.speechSynthesis.speak(currentUtterance);
  }
  
  $effect(() => {
    if (currentSimTime !== 0) {
      const index = announcements.findIndex((e) => {
        const startTime = e[0] as number;
        const isPlayed = e[2] as boolean;
        return !isPlayed && startTime <= currentSimTime;
      });
      
      if (index !== -1) {
        if (!isOwner && !audioUnlocked) {
          console.warn("Audio output blocked: User has not interacted with the page yet.");
          return;
        }

        announcements[index][2] = true;
        playAnnouncement(announcements[index][1] as string);
      }
    }
  })
  
  let isConnecting = false;
  let shareData = $state(page.url.searchParams.get('s') || localStorage.getItem('share'));
  $effect(() => {
    if (shareData) {
      isOwner = false;
      try {
        const sharedConfig = LZString.decompressFromEncodedURIComponent(shareData);
        if (sharedConfig) {
          const json = JSON.parse(sharedConfig);

          socketUrl = json.server;
          localStorage.setItem('socketUrl', socketUrl);
          
          if (isAuthed) {
            sessionCode = json.code;
            localStorage.setItem('sessionCode', socketUrl);
            loadData();
          } else if (!isConnecting && !connectionStatus) {
            isConnecting = true;
            connect();
          }
        }
      } catch (error) {
        console.error('Error while decompressing share data:', error);
      }
    }
  });
</script>

<div class="flex flex-col absolute top-0 right-0 text-right">
  <span>ID: {id}</span>
  <span>Session: {sessionCode}</span>
</div>
<div class="flex flex-row gap-4 justify-center items-center max-w-screen h-screen">
  <div class="box">
    <Chart {props} bind:isPlaying={isPlaying} bind:currentSimTime={currentSimTime} class="w-200 h-150" />
  </div>

  <div class="flex flex-col gap-4 w-80">
    {#if isOwner}
    <div class="box">
      <div class="title">
        Online Session
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <PenSolid class="shrink-0 h-6 w-6 text-orange-300" /><input type="url" placeholder="Server" value={socketUrl} />
        </div>
        <button onclick={() => {
          if (connectionStatus) {
            socket.io.disconnect();
          } else {
            if (inputUrl) {
              socketUrl = inputUrl;
            }
            if (socketUrl) {
              localStorage.setItem('socketUrl', socketUrl);
              socket = new Socket(socketUrl);
              connect();
            }
          }
        }} class="button w-full">
          {#if connectionStatus}Disconnect{:else}Connect{/if}
        </button>
        {#if connectionStatus && authUrl !== ''}
        <div>
          <a class="button w-full" about="_blank" href={authUrl}>
            Authorize
          </a>
        </div>
        {/if}
      </div>
    </div>
    {/if}

    <div class="box flex flex-col">
      <div class="title">
        Animation
      </div>
      <div class="flex flex-col gap-2 items-center">
        <div class="flex flex-row gap-2 w-full">
          <Display name="SCRAM temp" compact showUncertainty={false} edit={editScramTemp} bind:value={scramTemp} decimals={0} unit="K" inputClass="w-12" wrapperClass="text-orange-300 w-full" />
          {#if isOwner}<button onclick={loadData} class="button w-full">Confirm</button>{/if}
        </div>
        {#if isOwner}
        <div class="flex flex-row gap-2 w-full">
          <button onclick={() => {
            if (currentSimTime < endTime) {
              isPlaying = !isPlaying;
              update();
            }
          }} class="button w-full">
            {isPlaying ? 'Pause' : currentSimTime > startTime ? 'Continue' : 'Start'}
          </button>
          
          <button onclick={() => { {
            isPlaying = false;
            currentSimTime = startTime;
            update();

            for (let i = 0; i < announcements.length; i++) {
              announcements[i][2] = false;
            }
          }}} class="button w-full">
            Reset
          </button>
        </div>
        {/if}
      </div>
    </div>
    {#if shareLink}
      <Clipboard class="button w-full" bind:value={shareLink} bind:success={shareLinkCopied}>
        {#if shareLinkCopied}Link copied to Clipboard{:else}Share configuration{/if}
      </Clipboard>
    {/if}
    {#if userList.length > 0}
    <div class="flex flex-col box">
      <div class="title">Users</div>
      <div class="flex flex-col gap-2">
        {#each userList as user}
        <span>{user}</span>
        {/each}
      </div>
    </div>
    {/if}
    {#if !isOwner && !audioUnlocked}
    <div class="box flex flex-col">
      <div class="title">Audio</div>
      <button onclick={() => {
        audioUnlocked = true;
        // Ein leerer Aufruf entsperrt die SpeechSynthesis-Engine im Browser
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      }} class="button w-full">
        Sprachausgabe aktivieren
      </button>
    </div>
    {/if}
    {#if shareData}
    <div class="box flex flex-col">
      <div class="title">Share</div>
      <button onclick={() => {
        shareData = '';
        localStorage.removeItem('share');
        sessionCode = '';
        localStorage.removeItem('sessionCode');
        socketUrl = '';
        localStorage.removeItem('socketUrl');
        isOwner = true;
        loadData();
      }} class="button w-full">
        Reset
      </button>
    </div>
    {/if}
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";

  input {
    @apply bg-[#1e1e1e] border-orange-300 text-orange-300;
  }

  button, .button {
    @apply px-4 py-2;
  }

  a.button {
    @apply block text-center;
  }
</style>