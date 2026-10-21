<script>
    import { onMount, onDestroy } from "svelte";
    import { Pages } from "../pages.js";
    import Peer from "peerjs";

    export let args;

    let peer;
    let conn;
    let isHost = args?.isHost || false;
    let roomId = args?.roomId || "";
    let status = "Initializing...";
    let currentAnimeId = null;
    let currentEpisode = null;

    onMount(() => {
        status = "Connecting to P2P server...";
        peer = new Peer();

        peer.on('open', (id) => {
            if (isHost) {
                roomId = id;
                status = `Waiting for peer. Share this ID: ${roomId}`;
            } else {
                status = `Joining room: ${roomId}...`;
                joinRoom();
            }
        });

        peer.on('connection', (connection) => {
            if (isHost) {
                conn = connection;
                setupConnection();
                status = "Connected! You are the host.";
                window.p2pConnection = conn;
                window.p2pIsHost = true;
            }
        });

        peer.on('error', (err) => {
            console.error("PeerJS error:", err);
            status = `Error: ${err.type} - ${err.message}`;
        });
    });

    function joinRoom() {
        conn = peer.connect(roomId);
        setupConnection();
        window.p2pConnection = conn;
        window.p2pIsHost = false;
    }

    function setupConnection() {
        conn.on('open', () => {
            if (!isHost) {
                status = "Connected to host! Waiting for host to start video...";
            }
        });

        conn.on('data', (data) => {
            console.log("Received data:", data);
            if (data.type === 'sync_start') {
                if (!isHost && data.release && data.episode) {
                     window.updateViewportComponent(Pages.PLAYER, {
                         release: data.release,
                         currentEpisode: data.episode,
                         episodes: data.episodes,
                         roomId: roomId,
                         isHost: false
                     });
                }
            } else if (['play', 'pause', 'seek', 'sync_time'].includes(data.type)) {
                window.dispatchEvent(new CustomEvent('p2p-sync', { detail: data }));
            }
        });

        conn.on('close', () => {
            status = "Connection closed.";
            window.p2pConnection = null;
        });
    }

    onDestroy(() => {
        // Keep connection alive for player, only destroy if navigating away from room explicitly?
        // Let's rely on window variables for now.
    });

</script>

<div class="room-container">
    <h2>Совместный просмотр (P2P)</h2>
    <p>Статус: {status}</p>

    {#if isHost}
        <div class="host-info">
            <p>ID комнаты:</p>
            <h3>{roomId}</h3>
            <button class="btn" on:click={() => navigator.clipboard.writeText(roomId)}>Скопировать ID</button>

            <p style="margin-top: 15px;">Выберите аниме и начните просмотр - друг подключится автоматически!</p>
        </div>
    {/if}
</div>

<style>
    .room-container {
        padding: 40px;
        color: white;
        height: 100%;
        box-sizing: border-box;
    }
    .host-info {
        margin-top: 20px;
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 8px;
        max-width: 400px;
    }
    .btn {
        background: #3a3a4c;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 10px;
    }
    .btn:hover {
        background: #4a4a5c;
    }
</style>
