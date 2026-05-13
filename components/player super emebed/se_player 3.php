<?php
/*
 * FLKRD Player - Professional Multi-Server Integration
 * Servers: FLKRD SERVER (Master), FLKRD SERVER 1 (Diamond), FLKRD SERVER 2 (Bronze)
 */

// 1. Get Parameters
$video_id = isset($_GET['video_id']) ? $_GET['video_id'] : (isset($_GET['id']) ? $_GET['id'] : '');
$is_tmdb = (isset($_GET['tmdb']) && $_GET['tmdb'] == '1') ? 1 : 0;
$season = isset($_GET['s']) ? $_GET['s'] : (isset($_GET['season']) ? $_GET['season'] : '');
$episode = isset($_GET['e']) ? $_GET['e'] : (isset($_GET['episode']) ? $_GET['episode'] : '');

// [FIX] Auto-detect ID type to prevent 404 errors
$is_imdb = (substr($video_id, 0, 2) === 'tt');
if ($is_imdb) $is_tmdb = 0; // Force TMDB off if it's an IMDB ID

// Advanced SuperEmbed Parameters
$sub_url = isset($_GET['sub_url']) ? $_GET['sub_url'] : '';
$sub_label = isset($_GET['sub_label']) ? $_GET['sub_label'] : '';
$check = isset($_GET['check']) ? $_GET['check'] : '';

// Validation
if (empty($video_id)) {
    die("Missing video_id parameter.");
}

// 2. Construct URLs
$is_tv = (!empty($season) && !empty($episode));

// Base parameters for SuperEmbed
$se_params = "&video_id=" . urlencode($video_id);
if ($is_tmdb) $se_params .= "&tmdb=1";
if ($is_tv) $se_params .= "&s=" . urlencode($season) . "&e=" . urlencode($episode);
if (!empty($sub_url)) $se_params .= "&sub_url=" . urlencode($sub_url);
if (!empty($sub_label)) $se_params .= "&sub_label=" . urlencode($sub_label);
if (!empty($check)) $se_params .= "&check=" . urlencode($check);

// Server 0: FLKRD SERVER (VidLink Pro) - MASTER
$server0_url = $is_tv 
    ? "https://vidlink.pro/tv/" . urlencode($video_id) . "/" . urlencode($season) . "/" . urlencode($episode)
    : "https://vidlink.pro/movie/" . urlencode($video_id);
$server0_url .= "?primaryColor=34cfeb&secondaryColor=5c4747&icons=vid&player=jw&autoplay=true";

// Server 1: FLKRD SERVER 1 (Multiembed Standard) - DIAMOND
$server1_url = "https://multiembed.mov/?" . ltrim($se_params, '&');

// Server 2: FLKRD SERVER 2 (VidKing) - BRONZE
if ($is_tv) {
    $server2_url = "https://www.vidking.net/embed/tv/" . urlencode($video_id) . "/" . urlencode($season) . "/" . urlencode($episode);
} else {
    $server2_url = "https://www.vidking.net/embed/movie/" . urlencode($video_id);
}
$server2_url .= "?autoplay=1&playsinline=1&subtitles=1";

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FLKRD Player PRO</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            background-color: #000;
            overflow: hidden;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        #player-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }

        #video-iframe {
            flex-grow: 1;
            width: 100%;
            border: none;
            background: #000;
        }

        #server-list {
            position: absolute;
            bottom: 25px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 12px;
            background: rgba(10, 10, 10, 0.85);
            padding: 10px 20px;
            border-radius: 50px;
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 100;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        #server-list:hover {
            opacity: 1 !important;
            transform: translateX(-50%) translateY(-5px);
        }

        .server-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #ccc;
            padding: 6px 15px;
            border-radius: 30px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            white-space: nowrap;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }

        .server-icon {
            width: 24px;
            height: 24px;
            object-fit: contain;
            mix-blend-mode: screen; /* Removes black background from generated icons */
            transition: transform 0.3s ease;
        }

        .server-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
        }

        .server-btn:hover .server-icon {
            transform: scale(1.2) rotate(5deg);
        }

        /* Server Specific Highlights */
        .btn-master.active {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.1));
            color: #ffd700;
            border: 1px solid rgba(255, 215, 0, 0.5);
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
        }

        .btn-diamond.active {
            background: linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(79, 172, 254, 0.1));
            color: #00f2fe;
            border: 1px solid rgba(0, 242, 254, 0.5);
            box-shadow: 0 0 20px rgba(0, 242, 254, 0.2);
        }

        .btn-bronze.active {
            background: linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(160, 82, 45, 0.1));
            color: #cd7f32;
            border: 1px solid rgba(205, 127, 50, 0.5);
            box-shadow: 0 0 20px rgba(205, 127, 50, 0.2);
        }

        .kurdish-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(74, 222, 128, 0.1);
            padding: 8px 16px;
            border-radius: 14px;
            border: 1px solid rgba(74, 222, 128, 0.2);
            margin-left: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            outline: none;
        }

        .kurdish-btn:hover {
            background: rgba(74, 222, 128, 0.2);
            border-color: rgba(74, 222, 128, 0.4);
            transform: translateY(-1px);
        }

        .kurdish-btn img {
            width: 18px;
            height: 12px;
            border-radius: 2px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .kurdish-btn span {
            font-size: 10px;
            font-weight: 900;
            color: #4ade80;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        /* Loader */
        #loader {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 45px;
            height: 45px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid #34cfeb;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            z-index: 50;
            pointer-events: none;
            transition: opacity 0.4s ease;
        }

        @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .loaded #loader {
            opacity: 0;
        }

        /* Inactivity */
        .idle #server-list {
            opacity: 0;
            pointer-events: none;
            transform: translateX(-50%) translateY(20px);
        }

        @media (max-width: 600px) {
            #server-list {
                bottom: 15px;
                padding: 8px 12px;
                gap: 6px;
                width: 92%;
                justify-content: center;
            }
            .server-btn {
                padding: 6px 10px;
                font-size: 9px;
                gap: 5px;
            }
            .server-icon {
                width: 18px;
                height: 18px;
            }
            .server-btn span { display: none; }
        }
    </style>
</head>
<body>

<div id="player-container">
    <div id="loader"></div>
    <iframe id="video-iframe" 
            src="<?php echo $server0_url; ?>" 
            allowfullscreen="true" 
            webkitallowfullscreen="true" 
            mozallowfullscreen="true" 
            scrolling="no" 
            frameborder="0"
            onload="onIframeLoad()"></iframe>

    <div id="server-list">
        <!-- MASTER: FLKRD SERVER (VidLink Pro) -->
        <button class="server-btn btn-master active" onclick="changeServer(this, '<?php echo $server0_url; ?>')">
            <img src="master_crown.png" class="server-icon" alt="Master">
            <span>FLKRD SERVER</span>
        </button>

        <!-- DIAMOND: FLKRD SERVER 1 (Multiembed VIP) -->
        <button class="server-btn btn-diamond" onclick="changeServer(this, '<?php echo $server1_url; ?>')">
            <img src="diamond.png" class="server-icon" alt="Diamond">
            <span>FLKRD SERVER 1</span>
        </button>

        <!-- BRONZE: FLKRD SERVER 2 (VidKing) -->
        <button class="server-btn btn-bronze" onclick="changeServer(this, '<?php echo $server2_url; ?>')">
            <img src="bronze.png" class="server-icon" alt="Bronze">
            <span>FLKRD SERVER 2</span>
        </button>

        <?php if($sub_url): ?>
        <button class="kurdish-btn" onclick="toggleNativeSubtitles()">
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/35/Flag_of_Kurdistan.svg" alt="KU">
            <span>CC KURDISH</span>
        </button>
        <?php endif; ?>
    </div>
</div>

<script>
    const iframe = document.getElementById('video-iframe');
    const container = document.getElementById('player-container');
    let idleTimer;

    function onIframeLoad() {
        container.classList.add('loaded');
    }

    function changeServer(btn, url) {
        if(btn.classList.contains('active')) return;
        
        container.classList.remove('loaded');
        document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        iframe.src = url;
    }

    function resetTimer() {
        container.classList.remove('idle');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            container.classList.add('idle');
        }, 3500);
    }

    document.addEventListener('mousemove', resetTimer);
    document.addEventListener('touchstart', resetTimer);
    resetTimer();
    function toggleNativeSubtitles() {
        // This is a placeholder for native subtitle toggle if provider supports it
        alert("Kurdish CC is active. If not showing, please check the player settings icon.");
    }
</script>

</body>
</html>
