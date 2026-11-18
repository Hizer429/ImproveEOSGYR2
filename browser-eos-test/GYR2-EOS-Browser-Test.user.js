// ==UserScript==
// @name         GYR2 EOS Browser Test
// @namespace    gyr2.operations.eos
// @version      0.1.5
// @description  EOS CSV workflow in Slack web with bundled icons; desktop version 3.4.2.
// @match        https://app.slack.com/*
// @match        https://*.slack.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_info
// @sandbox      DOM
// @noframes
// @run-at       document-end
// ==/UserScript==
// Bundled icons: Font Awesome Free 6.5.1, https://fontawesome.com, CC BY 4.0.
(function () {
    'use strict';
    const hostWindow = window;
    const hostDocument = document;
    const appVersion = "3.4.2";
    const appBodyHtml = "\n    <div id=\"starfield\"></div>\n\n    <header class=\"app-header\">\n        <div>\n            <p class=\"eyebrow\">Ansancw</p>\n            <h1>EOS Operations Console</h1>\n        </div>\n\n        <div class=\"user-info\">\n            <span class=\"badge badge-vto\"><i class=\"fas fa-user-clock\"></i> VTO</span>\n            <span class=\"badge badge-clerk\"><i class=\"fas fa-id-badge\"></i> CLERK</span>\n            <span class=\"version-badge\" id=\"eos-version\">Version: 1.0.0</span>\n        </div>\n    </header>\n\n    <main>\n        <section id=\"action-panel\" class=\"status-neutral\">\n            <div class=\"status-copy\">\n                <i id=\"action-icon\" class=\"fas fa-info-circle\"></i>\n                <span id=\"action-message\">Awaiting file selections...</span>\n            </div>\n            <div class=\"status-actions\">\n                <button id=\"reconcile-btn\" class=\"browse-btn process-btn\" disabled>\n                    <i class=\"fas fa-sync-alt\"></i> Generate EOS\n                </button>\n                <button id=\"export-btn\" class=\"browse-btn export-btn\" disabled>\n                    <i class=\"fas fa-file-export\"></i> Export CSV\n                </button>\n                \n            </div>\n        </section>\n\n        <section class=\"console-grid\" id=\"eos-dashboard-view\">\n            <aside class=\"side-panel inputs-panel\">\n                <div class=\"panel-heading\">\n                    <div>\n                        <p class=\"eyebrow\">Workflow Inputs</p>\n                        <h2>Files and Hub</h2>\n                    </div>\n                </div>\n\n                <div class=\"upload-container dual-upload-container\">\n                    <div class=\"upload-card\" id=\"yms-card\">\n                        <i class=\"fas fa-database main-icon fa-5x\"></i>\n                        <div>\n                            <h2>Load YMS File</h2>\n                            <p id=\"yms-status\">Select the most up-to-date manifest.</p>\n                        </div>\n                        <div class=\"file-card-actions\">\n                            <button id=\"browse-yms-btn\" class=\"browse-btn\">\n                                <i class=\"fas fa-search\"></i> Select\n                            </button>\n                            <button id=\"clear-yms-btn\" class=\"browse-btn danger-btn\" disabled>\n                                <i class=\"fas fa-trash\"></i> Remove\n                            </button>\n                        </div>\n                    </div>\n\n                    <div class=\"upload-card\" id=\"dockdash-card\">\n                        <i class=\"fas fa-file-csv main-icon fa-5x\"></i>\n                        <div>\n                            <h2>Load Dock Dash</h2>\n                            <p id=\"dockdash-status\">Select the Dock Dash CSV.</p>\n                        </div>\n                        <div class=\"file-card-actions\">\n                            <button id=\"browse-dockdash-btn\" class=\"browse-btn\" disabled>\n                                <i class=\"fas fa-search\"></i> Select\n                            </button>\n                            <button id=\"clear-dockdash-btn\" class=\"browse-btn danger-btn\" disabled>\n                                <i class=\"fas fa-trash\"></i> Remove\n                            </button>\n                        </div>\n                    </div>\n\n                    <div class=\"upload-card\" id=\"gap-filler-card\">\n                        <i class=\"fas fa-network-wired main-icon fa-5x\"></i>\n                        <div>\n                            <h2>Research Hub</h2>\n                            <p id=\"gap-filler-status\">Paste data to clear ghosts.</p>\n                        </div>\n                        <div class=\"file-card-actions\">\n                            <button id=\"open-hub-btn\" class=\"browse-btn hub-btn\">\n                                <i class=\"fas fa-laptop-code\"></i> Open\n                            </button>\n                        </div>\n                    </div>\n                </div>\n            </aside>\n\n            <section class=\"dashboard-panel\">\n                <div class=\"panel-heading\">\n                    <div>\n                        <p class=\"eyebrow\">Live Summary</p>\n                        <h2>EOS Metrics</h2>\n                    </div>\n                    <span class=\"hint-pill\"><i class=\"far fa-hand-pointer\"></i> Click a tile for details</span>\n                </div>\n\n                <div class=\"metric-section\">\n                    <h3>Operations</h3>\n                    <div class=\"metrics-grid operations-grid\">\n                        <div class=\"metric-tile\" id=\"dropPallets\" data-category=\"Operations\"><div class=\"tile-content\"><i class=\"fas fa-pallet icon\"></i><div class=\"label\">Drop Pallets</div><div class=\"value\">0</div></div></div>\n                        <div class=\"metric-tile\" id=\"dropFloor\" data-category=\"Operations\"><div class=\"tile-content\"><i class=\"fas fa-box-open icon\"></i><div class=\"label\">Drop Floor</div><div class=\"value\">0</div></div></div>\n                        <div class=\"metric-tile\" id=\"transshipYard\" data-category=\"Operations\"><div class=\"tile-content\"><i class=\"fas fa-exchange-alt icon\"></i><div class=\"label\">Transship Yard</div><div class=\"value\">0</div></div></div>\n                        <div class=\"metric-tile\" id=\"livesHanded\" data-category=\"Operations\"><div class=\"tile-content\"><i class=\"fas fa-handshake icon\"></i><div class=\"label\">Lives Handed Over</div><div class=\"value\">0</div></div></div>\n                    </div>\n                </div>\n\n                <div class=\"metric-section\">\n                    <h3>Parcels and Volume</h3>\n                    <div class=\"metrics-grid parcel-grid\">\n                        <div class=\"metric-tile\" id=\"totalParcels\" data-category=\"Parcels\"><div class=\"tile-content\"><i class=\"fas fa-boxes icon\"></i><div class=\"label\">Total Parcels</div><div class=\"value\">0</div></div></div>\n                        <div class=\"metric-tile\" id=\"parcelsDock\" data-category=\"Critical\"><div class=\"tile-content\"><i class=\"fas fa-shipping-fast icon\"></i><div class=\"label\">Parcels On Dock</div><div class=\"value\">0</div></div></div>\n                        <div class=\"metric-tile\" id=\"parcelsYard\" data-category=\"Parcels\"><div class=\"tile-content\"><i class=\"fas fa-parking icon\"></i><div class=\"label\">Parcels In Yard</div><div class=\"value\">0</div></div></div>\n                        <div class=\"metric-tile\" id=\"volumeDoors\" data-category=\"Volume\"><div class=\"tile-content\"><i class=\"fas fa-door-open icon\"></i><div class=\"label\">Volume On Doors</div><div class=\"value\">0</div></div></div>\n                        <div class=\"metric-tile\" id=\"volumeYard\" data-category=\"Volume\"><div class=\"tile-content\"><i class=\"fas fa-ruler-combined icon\"></i><div class=\"label\">Volume In Yard</div><div class=\"value\">0</div></div></div>\n                    </div>\n                </div>\n            </section>\n\n            <aside class=\"side-panel priority-panel\">\n                <div class=\"panel-heading compact\">\n                    <div>\n                        <p class=\"eyebrow\">Exception Work</p>\n                        <h2>Priority Queue</h2>\n                    </div>\n                </div>\n\n                <div class=\"priority-stack\">\n                    <div class=\"metric-tile priority-tile\" id=\"azngOver72\" data-category=\"Critical\"><div class=\"tile-content\"><i class=\"fas fa-clock icon\"></i><div class=\"label\">AZNG &gt; 72H</div><div class=\"value\">0</div></div></div>\n                    <div class=\"metric-tile priority-tile\" id=\"researchQueue\" data-category=\"Critical\"><div class=\"tile-content\"><i class=\"fas fa-search-plus icon\"></i><div class=\"label\">Research Queue</div><div class=\"value\">0</div></div></div>\n                </div>\n\n                <div class=\"api-test-card hidden-feature\">\n                    <button id=\"test-fc-api-btn\" class=\"browse-btn secondary-btn\" type=\"button\">\n                        <i class=\"fas fa-plug-circle-bolt\"></i> Test FC API\n                    </button>\n                    <p id=\"fc-api-status\">Use FCInboundDockService to enrich Research Queue ISAs.</p>\n                </div>\n\n                <div class=\"queue-note\">\n                    <i class=\"fas fa-circle-info\"></i>\n                    <span>Priority tiles open their detail list after EOS is generated.</span>\n                </div>\n            </aside>\n        </section>\n\n        </main>\n\n    <div id=\"detail-modal\" class=\"modal\">\n        <div class=\"modal-content\">\n            <button class=\"close-button\" id=\"close-modal-btn\" aria-label=\"Close details\">&times;</button>\n            <h2 id=\"modal-title\">Trailer Details</h2>\n            <div class=\"table-container\">\n                <table id=\"detail-table\">\n                    <thead><tr><th>ISA</th><th>VRID</th><th>LOC</th><th>ACTION</th></tr></thead>\n                    <tbody id=\"detail-table-body\"></tbody>\n                </table>\n            </div>\n        </div>\n    </div>\n\n    <div id=\"research-hub-modal\" class=\"modal\" style=\"display:none; z-index: 2000;\">\n        <div class=\"modal-content hub-modal-content\">\n            <div id=\"hub-step-1\">\n                <h2><i class=\"fas fa-database\"></i> Oculus Memory</h2>\n                <p class=\"modal-intro\">Upload the latest Oculus Vendor and Transship CSVs. The app will store ISA, cartons, units, and pallets until the next Oculus sync.</p>\n                <div class=\"hub-grid oculus-upload-grid\">\n                    <div class=\"oculus-upload-card\" id=\"oculus-vendor-card\">\n                        <i class=\"fas fa-truck-loading\"></i>\n                        <div>\n                            <h3>Vendor CSV</h3>\n                            <p id=\"oculus-vendor-status\">Drops and AF lives/live-drops.</p>\n                        </div>\n                        <div class=\"file-card-actions\">\n                            <button id=\"browse-oculus-vendor-btn\" class=\"browse-btn\" type=\"button\">\n                                <i class=\"fas fa-file-csv\"></i> Select\n                            </button>\n                            <button id=\"clear-oculus-vendor-btn\" class=\"browse-btn danger-btn\" type=\"button\" disabled>\n                                <i class=\"fas fa-trash\"></i> Remove\n                            </button>\n                        </div>\n                    </div>\n                    <div class=\"oculus-upload-card\" id=\"oculus-transship-card\">\n                        <i class=\"fas fa-exchange-alt\"></i>\n                        <div>\n                            <h3>Transship CSV</h3>\n                            <p id=\"oculus-transship-status\">Transship trailers and unit counts.</p>\n                        </div>\n                        <div class=\"file-card-actions\">\n                            <button id=\"browse-oculus-transship-btn\" class=\"browse-btn\" type=\"button\">\n                                <i class=\"fas fa-file-csv\"></i> Select\n                            </button>\n                            <button id=\"clear-oculus-transship-btn\" class=\"browse-btn danger-btn\" type=\"button\" disabled>\n                                <i class=\"fas fa-trash\"></i> Remove\n                            </button>\n                        </div>\n                    </div>\n                </div>\n                <p class=\"oculus-sync-summary\" id=\"oculus-sync-summary\">No Oculus files selected.</p>\n                <div class=\"modal-actions\">\n                    <button data-eos-action=\"cancel-hub\" class=\"browse-btn secondary-btn\">Cancel</button>\n                    <button id=\"sync-oculus-memory-btn\" data-eos-action=\"sync\" class=\"browse-btn success-btn\" disabled>Sync Oculus Memory <i class=\"fas fa-check-circle\"></i></button>\n                </div>\n            </div>\n        </div>\n    </div>\n\n    <div id=\"fc-api-modal\" class=\"modal\" style=\"display:none; z-index: 2100;\">\n        <div class=\"modal-content api-modal-content\">\n            <h2><i class=\"fas fa-plug-circle-bolt\"></i> FC API Test</h2>\n            <p class=\"modal-intro\">Enter the FCInboundDockService API Gateway details to test Research Queue enrichment.</p>\n            <div class=\"api-config-grid\">\n                <label class=\"field-label\" for=\"fc-api-endpoint-input\">API Gateway Endpoint</label>\n                <input id=\"fc-api-endpoint-input\" type=\"text\" placeholder=\"https://...\">\n\n                <label class=\"field-label\" for=\"fc-api-warehouse-input\">Warehouse ID</label>\n                <input id=\"fc-api-warehouse-input\" type=\"text\" value=\"GYR2\">\n\n                <label class=\"field-label\" for=\"fc-api-token-input\">Authorization Token Optional</label>\n                <input id=\"fc-api-token-input\" type=\"password\" placeholder=\"Bearer token or raw token\">\n            </div>\n            <div class=\"modal-actions\">\n                <button id=\"fc-api-cancel-btn\" class=\"browse-btn secondary-btn\" type=\"button\">Cancel</button>\n                <button id=\"fc-api-submit-btn\" class=\"browse-btn\" type=\"button\">\n                    <i class=\"fas fa-plug-circle-bolt\"></i> Test API\n                </button>\n            </div>\n        </div>\n    </div>\n\n    <footer>\n        <span>EOS dashboard ready</span>\n    </footer>\n\n    \n    \n    \n";
    const appCss = ".eos-root {\n    --bg: #0b1016;\n    --panel: #121a23;\n    --panel-2: #172230;\n    --panel-3: #0f1720;\n    --line: #283544;\n    --line-strong: #344657;\n    --text-color: #eef4f8;\n    --muted: #8fa2b4;\n    --primary-color: #ff9900;\n    --primary-2: #ffb84d;\n    --cyan: #22d3ee;\n    --teal: #2dd4bf;\n    --green: #4ade80;\n    --violet: #a78bfa;\n    --red: #fb7185;\n    --shadow: 0 24px 70px rgba(0, 0, 0, 0.35);\n    --app-scale: 1;\n    --app-max-width: 1460px;\n    --app-gutter: clamp(14px, calc(28px * var(--app-scale)), 34px);\n    --panel-pad: clamp(12px, calc(16px * var(--app-scale)), 20px);\n    --grid-gap: clamp(10px, calc(16px * var(--app-scale)), 20px);\n    --tile-pad: clamp(11px, calc(14px * var(--app-scale)), 18px);\n    --tile-height: clamp(112px, calc(132px * var(--app-scale)), 158px);\n    --side-column: clamp(250px, calc(280px * var(--app-scale)), 310px);\n    --priority-column: clamp(230px, calc(260px * var(--app-scale)), 290px);\n}\n\n* {\n    box-sizing: border-box;\n}\n\n.eos-root {\n    font-size: clamp(13px, calc(15px * var(--app-scale)), 17px);\n}\n\n.eos-body {\n    min-height: 100vh;\n    margin: 0;\n    background: var(--bg);\n    color: var(--text-color);\n    font-family: \"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif;\n    overflow-x: hidden;\n}\n\nbutton,\ninput,\ntextarea,\nselect {\n    font: inherit;\n}\n\nbutton:disabled {\n    cursor: not-allowed;\n    filter: saturate(0.35);\n    opacity: 0.58;\n}\n\n#starfield {\n    position: fixed;\n    inset: 0;\n    z-index: -1;\n    overflow: hidden;\n    background:\n        radial-gradient(circle at 20% 0%, rgba(56, 189, 248, 0.12), transparent 32rem),\n        linear-gradient(135deg, #0b1016 0%, #111827 100%);\n    pointer-events: none;\n}\n\n.star {\n    position: absolute;\n    width: 2px;\n    height: 2px;\n    border-radius: 50%;\n    background: rgba(255, 255, 255, 0.72);\n    animation: twinkle 3s infinite ease-in-out;\n}\n\n@keyframes twinkle {\n    0%, 100% { opacity: 0.72; transform: scale(1); }\n    50% { opacity: 0.2; transform: scale(0.8); }\n}\n\n.app-header {\n    position: sticky;\n    top: 0;\n    z-index: 100;\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: calc(24px * var(--app-scale));\n    padding: clamp(14px, calc(18px * var(--app-scale)), 22px) var(--app-gutter);\n    border-bottom: 1px solid var(--line);\n    background: rgba(11, 16, 22, 0.9);\n    backdrop-filter: blur(16px);\n}\n\n.eyebrow {\n    margin: 0 0 4px;\n    color: var(--primary-2);\n    font-size: 0.72rem;\n    font-weight: 800;\n    letter-spacing: 0.08em;\n    text-transform: uppercase;\n}\n\nh1,\nh2,\nh3,\np {\n    margin-top: 0;\n}\n\nh1 {\n    margin-bottom: 0;\n    font-size: 1.45rem;\n    line-height: 1.15;\n}\n\nh2 {\n    margin-bottom: 0;\n    font-size: 1.1rem;\n    line-height: 1.2;\n}\n\nh3 {\n    margin-bottom: 12px;\n    color: #c9d6e2;\n    font-size: 0.82rem;\n    letter-spacing: 0.05em;\n    text-transform: uppercase;\n}\n\n.user-info {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n}\n\n.badge,\n.version-badge,\n.hint-pill {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    gap: 7px;\n    min-height: 32px;\n    padding: 6px 10px;\n    border: 1px solid var(--line);\n    border-radius: 999px;\n    color: var(--muted);\n    font-size: 0.8rem;\n    font-weight: 700;\n    white-space: nowrap;\n}\n\n.badge-vto {\n    border-color: rgba(255, 153, 0, 0.35);\n    color: var(--primary-2);\n}\n\n.badge-clerk {\n    border-color: rgba(74, 222, 128, 0.35);\n    color: var(--green);\n}\n\nmain {\n    width: min(var(--app-max-width), 100%);\n    margin: 0 auto;\n    padding: clamp(14px, calc(18px * var(--app-scale)), 24px) var(--app-gutter) clamp(16px, calc(22px * var(--app-scale)), 30px);\n}\n\n#action-panel {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: calc(18px * var(--app-scale));\n    margin-bottom: var(--grid-gap);\n    padding: var(--panel-pad);\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: rgba(18, 26, 35, 0.92);\n    box-shadow: var(--shadow);\n}\n\n#action-panel.status-neutral {\n    border-color: var(--line);\n    background: rgba(18, 26, 35, 0.92);\n}\n\n#action-panel.status-success {\n    border-color: rgba(74, 222, 128, 0.34);\n    background: linear-gradient(90deg, rgba(74, 222, 128, 0.14), rgba(18, 26, 35, 0.92));\n}\n\n#action-panel.status-critical {\n    border-color: rgba(251, 113, 133, 0.34);\n    background: linear-gradient(90deg, rgba(251, 113, 133, 0.16), rgba(255, 153, 0, 0.08));\n}\n\n#action-panel.cut-hidden {\n    display: none;\n}\n\n.status-copy {\n    display: flex;\n    align-items: center;\n    min-width: 0;\n    gap: 14px;\n    font-weight: 800;\n}\n\n#action-icon {\n    display: grid;\n    flex: 0 0 auto;\n    place-items: center;\n    width: 42px;\n    height: 42px;\n    border-radius: 8px;\n    background: #223041;\n    color: var(--primary-color);\n    font-size: 1.2rem;\n}\n\n.status-critical #action-icon {\n    background: rgba(251, 113, 133, 0.18);\n    color: var(--red);\n}\n\n.status-success #action-icon {\n    background: rgba(74, 222, 128, 0.16);\n    color: var(--green);\n}\n\n#action-message {\n    min-width: 0;\n    overflow-wrap: anywhere;\n}\n\n.status-actions {\n    display: flex;\n    flex: 0 0 auto;\n    gap: 10px;\n}\n\n.browse-btn,\n.btn-warning,\n.nav-btn,\n.close-overlay {\n    display: inline-flex;\n    align-items: center;\n    justify-content: center;\n    gap: 8px;\n    min-height: 40px;\n    padding: 0 14px;\n    border: 0;\n    border-radius: 8px;\n    background: linear-gradient(135deg, var(--primary-color), #f97316);\n    color: #16100a;\n    font-size: 0.88rem;\n    font-weight: 900;\n    cursor: pointer;\n    text-decoration: none;\n    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);\n    transition: border-color 0.18s, box-shadow 0.18s, filter 0.18s, transform 0.18s;\n}\n\n.browse-btn:hover:not(:disabled),\n.btn-warning:hover:not(:disabled),\n.nav-btn:hover:not(:disabled),\n.close-overlay:hover:not(:disabled) {\n    filter: brightness(1.08);\n    transform: translateY(-1px);\n    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.24);\n}\n\n.browse-btn:active:not(:disabled),\n.btn-warning:active:not(:disabled),\n.nav-btn:active:not(:disabled),\n.close-overlay:active:not(:disabled) {\n    transform: translateY(0);\n    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);\n}\n\n.browse-btn:focus-visible,\n.btn-warning:focus-visible,\n.nav-btn:focus-visible,\n.close-overlay:focus-visible {\n    outline: 2px solid rgba(255, 184, 77, 0.85);\n    outline-offset: 3px;\n}\n\n.export-btn,\n.success-btn {\n    background: linear-gradient(135deg, var(--green), #22c55e);\n}\n\n.hub-btn {\n    background: linear-gradient(135deg, var(--violet), #7c3aed);\n    color: #f8f5ff;\n}\n\n.secondary-btn {\n    border: 1px solid var(--line);\n    background: linear-gradient(180deg, #243347, #1b2735);\n    color: var(--text-color);\n}\n\n.console-grid {\n    display: grid;\n    grid-template-columns: var(--side-column) minmax(0, 1fr) var(--priority-column);\n    gap: var(--grid-gap);\n    align-items: start;\n}\n\n.side-panel,\n.dashboard-panel,\n.tool-card {\n    min-width: 0;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: rgba(18, 26, 35, 0.92);\n    box-shadow: var(--shadow);\n}\n\n.side-panel,\n.dashboard-panel {\n    padding: var(--panel-pad);\n}\n\n.panel-heading {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: calc(14px * var(--app-scale));\n    margin-bottom: calc(18px * var(--app-scale));\n}\n\n.panel-heading.compact {\n    margin-bottom: 14px;\n}\n\n.upload-container {\n    display: grid;\n    gap: clamp(8px, calc(10px * var(--app-scale)), 13px);\n}\n\n.upload-card {\n    display: grid;\n    grid-template-columns: 34px minmax(0, 1fr);\n    align-items: start;\n    gap: calc(12px * var(--app-scale));\n    min-height: clamp(64px, calc(72px * var(--app-scale)), 84px);\n    padding: clamp(10px, calc(12px * var(--app-scale)), 15px);\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-2);\n}\n\n.upload-card.success {\n    border-color: rgba(74, 222, 128, 0.42);\n}\n\n.upload-card.error {\n    border-color: rgba(251, 113, 133, 0.42);\n}\n\n.main-icon {\n    color: var(--primary-color);\n    font-size: 1.25rem !important;\n}\n\n.upload-card.success .main-icon {\n    color: var(--green);\n}\n\n.upload-card.error .main-icon {\n    color: var(--red);\n}\n\n.file-card-actions {\n    display: flex;\n    grid-column: 1 / -1;\n    flex-wrap: nowrap;\n    gap: 10px;\n}\n\n.file-card-actions .browse-btn {\n    flex: 1 1 0;\n    min-width: 0;\n    padding-inline: 10px;\n    white-space: nowrap;\n}\n\n.danger-btn {\n    background: linear-gradient(135deg, #fb7185, #ef4444);\n    color: #210b0f;\n}\n\n.danger-btn:disabled {\n    cursor: not-allowed;\n    opacity: 0.45;\n    filter: grayscale(0.35);\n}\n\n.upload-card h2 {\n    margin-bottom: 3px;\n    font-size: 0.95rem;\n    line-height: 1.2;\n}\n\n.upload-card p {\n    margin: 0;\n    color: var(--muted);\n    font-size: 0.78rem;\n    line-height: 1.35;\n}\n\n.queue-note {\n    margin-top: 16px;\n    padding: 12px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-3);\n}\n\n.queue-note {\n    color: var(--muted);\n    font-size: 0.82rem;\n    line-height: 1.4;\n}\n\n.queue-note {\n    display: flex;\n    gap: 10px;\n}\n\n.queue-note i {\n    margin-top: 2px;\n    color: var(--primary-2);\n}\n\n.api-test-card {\n    display: grid;\n    gap: 9px;\n    margin-top: 16px;\n    padding: 12px;\n    border: 1px solid rgba(34, 211, 238, 0.28);\n    border-radius: 8px;\n    background: rgba(34, 211, 238, 0.06);\n}\n\n.api-test-card .browse-btn {\n    width: 100%;\n}\n\n.api-test-card p {\n    margin: 0;\n    color: var(--muted);\n    font-size: 0.78rem;\n    font-weight: 800;\n    line-height: 1.35;\n}\n\n.api-test-card.success {\n    border-color: rgba(74, 222, 128, 0.36);\n    background: rgba(74, 222, 128, 0.07);\n}\n\n.api-test-card.error {\n    border-color: rgba(251, 113, 133, 0.38);\n    background: rgba(251, 113, 133, 0.08);\n}\n\n.metric-section + .metric-section {\n    margin-top: calc(18px * var(--app-scale));\n}\n\n.metrics-grid {\n    display: grid;\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n    gap: clamp(9px, calc(12px * var(--app-scale)), 16px);\n}\n\n.parcel-grid {\n    grid-template-columns: repeat(5, minmax(0, 1fr));\n}\n\n.priority-stack {\n    display: grid;\n    gap: clamp(9px, calc(12px * var(--app-scale)), 16px);\n}\n\n.metric-tile {\n    container-type: inline-size;\n    min-height: var(--tile-height);\n    padding: var(--tile-pad);\n    border: 1px solid var(--line);\n    border-left-width: 4px;\n    border-radius: 8px;\n    background: linear-gradient(180deg, #182331, #121a23);\n    cursor: pointer;\n    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;\n}\n\n.metric-tile:hover {\n    border-color: var(--line-strong);\n    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);\n    transform: translateY(-2px);\n}\n\n.priority-tile {\n    min-height: clamp(126px, calc(150px * var(--app-scale)), 178px);\n}\n\n.tile-content {\n    min-width: 0;\n}\n\n.icon {\n    margin-bottom: clamp(12px, calc(18px * var(--app-scale)), 22px);\n    font-size: 1.25rem;\n}\n\n.label {\n    min-height: 32px;\n    color: var(--muted);\n    font-size: 0.76rem;\n    font-weight: 800;\n    letter-spacing: 0.04em;\n    line-height: 1.25;\n    text-transform: uppercase;\n}\n\n.value {\n    margin-top: clamp(6px, calc(8px * var(--app-scale)), 10px);\n    max-width: 100%;\n    overflow: hidden;\n    font-size: clamp(1.55rem, 23cqw, 2rem);\n    font-weight: 900;\n    line-height: 1;\n    letter-spacing: 0;\n    white-space: nowrap;\n    font-variant-numeric: tabular-nums;\n}\n\n.metric-tile[data-category=\"Volume\"] .value {\n    font-size: clamp(1.35rem, 20cqw, 1.85rem);\n}\n\n.value.long-value {\n    font-size: clamp(1.35rem, 19cqw, 1.75rem);\n}\n\n.value.extra-long-value {\n    font-size: clamp(1.15rem, 17cqw, 1.55rem);\n}\n\n.metric-tile[data-category=\"Operations\"] {\n    border-left-color: var(--cyan);\n}\n\n.metric-tile[data-category=\"Operations\"] .icon,\n.metric-tile[data-category=\"Operations\"] .value {\n    color: var(--cyan);\n}\n\n.metric-tile[data-category=\"Parcels\"] {\n    border-left-color: var(--violet);\n}\n\n.metric-tile[data-category=\"Parcels\"] .icon,\n.metric-tile[data-category=\"Parcels\"] .value {\n    color: var(--violet);\n}\n\n.metric-tile[data-category=\"Critical\"] {\n    border-left-color: var(--red);\n}\n\n.metric-tile[data-category=\"Critical\"] .icon,\n.metric-tile[data-category=\"Critical\"] .value {\n    color: var(--red);\n}\n\n.metric-tile[data-category=\"Volume\"] {\n    border-left-color: var(--green);\n}\n\n.metric-tile[data-category=\"Volume\"] .icon,\n.metric-tile[data-category=\"Volume\"] .value {\n    color: var(--green);\n}\n\n.metric-tile.critical-active {\n    border-color: rgba(251, 113, 133, 0.55);\n    box-shadow: 0 0 0 1px rgba(251, 113, 133, 0.25), 0 18px 42px rgba(251, 113, 133, 0.13);\n}\n\n.compact-display .hint-pill {\n    display: none;\n}\n\n.compact-display .metric-tile {\n    min-height: 108px;\n}\n\n.compact-display .priority-tile {\n    min-height: 118px;\n}\n\n.compact-display .icon {\n    margin-bottom: 10px;\n}\n\n.wide-display .metric-tile {\n    min-height: 152px;\n}\n\n.hidden-section {\n    display: none;\n    margin-top: 16px;\n    animation: slideDown 0.25s ease-out;\n}\n\n.hidden-feature {\n    display: none !important;\n}\n\n.hidden-section.visible {\n    display: block;\n}\n\n@keyframes slideDown {\n    from { opacity: 0; transform: translateY(-10px); }\n    to { opacity: 1; transform: translateY(0); }\n}\n\n.tool-card {\n    padding: var(--panel-pad);\n}\n\n.tool-split {\n    display: grid;\n    grid-template-columns: 1.25fr 0.75fr;\n    gap: var(--grid-gap);\n}\n\n.generator-box,\n.decoder-box {\n    min-width: 0;\n    padding: 14px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-2);\n}\n\n.barcode-controls {\n    display: grid;\n    grid-template-columns: repeat(3, 1fr);\n    gap: 10px;\n    margin-bottom: 12px;\n}\n\n.barcode-controls label,\n.field-label,\n.hub-grid label {\n    display: grid;\n    gap: 6px;\n    color: #c9d6e2;\n    font-size: 0.78rem;\n    font-weight: 800;\n    text-transform: uppercase;\n}\n\ninput,\ntextarea,\nselect {\n    width: 100%;\n    border: 1px solid var(--line-strong);\n    border-radius: 8px;\n    background: #0b121a;\n    color: var(--text-color);\n    outline: none;\n}\n\ninput:focus,\ntextarea:focus,\nselect:focus {\n    border-color: rgba(255, 153, 0, 0.62);\n    box-shadow: 0 0 0 3px rgba(255, 153, 0, 0.1);\n}\n\n.barcode-controls input {\n    min-height: 38px;\n    padding: 8px;\n}\n\ntextarea#admin-input,\ninput#admin-decoder {\n    font-family: Consolas, \"Courier New\", monospace;\n}\n\ntextarea#admin-input {\n    min-height: 150px;\n    padding: 10px;\n    resize: vertical;\n}\n\ninput#admin-decoder {\n    min-height: 42px;\n    padding: 10px;\n}\n\n.tool-actions {\n    display: flex;\n    gap: 10px;\n    margin-top: 10px;\n}\n\n.tool-actions .btn-warning {\n    flex: 1;\n}\n\n.output-display {\n    min-height: 92px;\n    margin-top: 10px;\n    padding: 10px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-3);\n    color: var(--primary-2);\n    font-family: Consolas, \"Courier New\", monospace;\n    font-size: 0.82rem;\n    white-space: pre-wrap;\n}\n\n.memory-test-toggle {\n    margin-top: 12px;\n    padding: 10px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-3);\n}\n\n.memory-test-toggle label {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n    color: var(--muted);\n    font-size: 0.82rem;\n    font-weight: 800;\n}\n\n.memory-test-toggle input {\n    width: 18px;\n    height: 18px;\n    accent-color: var(--primary-color);\n}\n\n.memory-admin-actions {\n    margin-top: 12px;\n    padding: 10px;\n    border: 1px solid rgba(251, 113, 133, 0.36);\n    border-radius: 8px;\n    background: rgba(251, 113, 133, 0.08);\n}\n\n.memory-admin-actions .btn-warning {\n    width: 100%;\n}\n\n.memory-admin-actions p {\n    margin: 8px 0 0;\n    color: var(--muted);\n    font-size: 0.78rem;\n    line-height: 1.35;\n}\n\n#printable-area {\n    margin-top: 14px;\n}\n\n.barcode-wrapper {\n    display: inline-block;\n    margin: 0 12px 16px 0;\n    padding: 12px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: #ffffff;\n}\n\n.modal {\n    display: none;\n    position: fixed;\n    inset: 0;\n    z-index: 200;\n    overflow: auto;\n    padding: 32px 18px;\n    background-color: rgba(0, 0, 0, 0.76);\n    backdrop-filter: blur(8px);\n}\n\n.modal-content {\n    width: min(980px, 100%);\n    max-height: calc(100vh - 64px);\n    margin: 0 auto;\n    overflow-y: auto;\n    padding: 24px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel);\n    box-shadow: var(--shadow);\n}\n\n.close-button {\n    float: right;\n    width: 36px;\n    min-height: 36px;\n    padding: 0;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-2);\n    color: var(--text-color);\n    font-size: 1.5rem;\n    cursor: pointer;\n}\n\n.close-button:hover {\n    border-color: rgba(255, 153, 0, 0.62);\n    color: var(--primary-color);\n}\n\n.table-container {\n    width: 100%;\n    overflow: auto;\n}\n\n#detail-table {\n    width: 100%;\n    min-width: 660px;\n    margin-top: 15px;\n    border-collapse: collapse;\n    color: var(--text-color);\n}\n\n#detail-table th,\n#detail-table td {\n    padding: 12px 15px;\n    border-bottom: 1px solid var(--line);\n    text-align: left;\n}\n\n#detail-table th {\n    background-color: rgba(255, 153, 0, 0.1);\n    color: var(--primary-2);\n    font-size: 0.78rem;\n    text-transform: uppercase;\n}\n\n#detail-table tbody tr:hover {\n    background-color: rgba(255, 255, 255, 0.04);\n}\n\n.research-assignment-controls {\n    display: grid;\n    min-width: 150px;\n    gap: 8px;\n}\n\n.research-select,\n.research-units-input {\n    min-height: 36px;\n    padding: 7px 9px;\n    border: 1px solid var(--line-strong);\n    border-radius: 8px;\n    background: #0b121a;\n    color: var(--text-color);\n}\n\n.research-select option,\n.research-select optgroup {\n    background: #0b121a;\n    color: var(--text-color);\n}\n\n.research-units-input {\n    width: 100%;\n    color: var(--green);\n    font-weight: 900;\n}\n\n.research-units-input::placeholder {\n    color: var(--muted);\n    font-weight: 700;\n}\n\n.research-edit-btn,\n.research-move-btn {\n    min-height: 32px;\n    border: 0;\n    border-radius: 8px;\n    color: #121a23;\n    font-weight: 900;\n    cursor: pointer;\n}\n\n.research-edit-btn {\n    background: linear-gradient(135deg, #fbbf24, #f97316);\n}\n\n.research-move-btn {\n    background: linear-gradient(135deg, var(--green), #22c55e);\n}\n\n.hub-modal-content h2 {\n    margin-bottom: 10px;\n    color: var(--primary-2);\n}\n\n.modal-intro {\n    margin-bottom: 16px;\n    color: var(--muted);\n}\n\n.hub-grid {\n    display: grid;\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n    gap: 16px;\n}\n\n.oculus-upload-grid {\n    align-items: stretch;\n}\n\n.oculus-upload-card {\n    display: grid;\n    grid-template-columns: auto 1fr;\n    align-items: center;\n    gap: 14px;\n    min-height: 156px;\n    padding: 18px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: rgba(255, 255, 255, 0.035);\n}\n\n.oculus-upload-card > i {\n    color: var(--primary-2);\n    font-size: 2rem;\n}\n\n.oculus-upload-card h3 {\n    margin: 0 0 6px;\n    color: var(--text-color);\n    font-size: 0.98rem;\n}\n\n.oculus-upload-card p {\n    margin: 0;\n    color: var(--muted);\n    font-size: 0.84rem;\n}\n\n.oculus-upload-card > .browse-btn,\n.oculus-upload-card > .file-card-actions {\n    grid-column: 1 / -1;\n}\n\n.oculus-upload-card > .browse-btn {\n    justify-content: center;\n}\n\n.oculus-upload-card.success {\n    border-color: rgba(34, 197, 94, 0.55);\n}\n\n.oculus-upload-card.error {\n    border-color: rgba(239, 68, 68, 0.65);\n}\n\n.oculus-sync-summary {\n    margin: 16px 0 0;\n    color: var(--muted);\n    font-weight: 800;\n}\n\n.api-modal-content {\n    width: min(720px, 100%);\n}\n\n.api-modal-content h2 {\n    margin-bottom: 10px;\n    color: var(--primary-2);\n}\n\n.api-config-grid {\n    display: grid;\n    gap: 8px;\n}\n\n.api-config-grid input {\n    min-height: 42px;\n    padding: 10px;\n    margin-bottom: 8px;\n}\n\n.cut-board-view {\n    margin-top: 0;\n}\n\n.cut-viewbar {\n    display: grid;\n    grid-template-columns: auto 1fr auto;\n    align-items: center;\n    gap: 16px;\n    margin-bottom: 16px;\n    padding: 16px;\n    border: 1px solid rgba(255, 153, 0, 0.36);\n    border-radius: 8px;\n    background: linear-gradient(90deg, rgba(255, 153, 0, 0.14), rgba(34, 211, 238, 0.07));\n    box-shadow: var(--shadow);\n}\n\n.cut-viewbar-copy h2 {\n    margin-bottom: 0;\n    color: #f8fafc;\n    font-size: 1.08rem;\n}\n\n.cut-viewbar-actions {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n}\n\n.cut-shell {\n    display: grid;\n    grid-template-columns: 310px minmax(0, 1fr) 320px;\n    gap: var(--grid-gap);\n    align-items: start;\n}\n\n.cut-source-card {\n    display: grid;\n    grid-template-columns: 36px 1fr;\n    align-items: center;\n    gap: 12px;\n    min-height: 64px;\n    margin-top: 10px;\n    padding: 12px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-2);\n}\n\n.cut-source-card i {\n    color: var(--primary-2);\n    font-size: 1.1rem;\n}\n\n.cut-source-card strong,\n.cut-source-card span {\n    display: block;\n}\n\n.cut-source-card span {\n    margin-top: 3px;\n    color: var(--muted);\n    font-size: 0.78rem;\n}\n\n.cut-source-card.ready {\n    border-color: rgba(34, 197, 94, 0.36);\n}\n\n.cut-source-card.ready i {\n    color: var(--green);\n}\n\n.cut-filter-stack {\n    display: grid;\n    gap: 8px;\n    margin-top: 18px;\n}\n\n.cut-filter-heading {\n    padding: 12px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-3);\n}\n\n.cut-filter-heading span,\n.cut-metric-card span,\n.cut-action-card span {\n    display: block;\n    color: var(--muted);\n    font-size: 0.78rem;\n}\n\n.cut-filter-heading strong {\n    display: block;\n    margin-top: 5px;\n    color: var(--text-color);\n}\n\n.cut-filter {\n    display: inline-flex;\n    align-items: center;\n    justify-content: flex-start;\n    gap: 8px;\n    min-height: 40px;\n    padding: 0 14px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: #202c3a;\n    color: var(--text-color);\n    font: inherit;\n    font-size: 0.88rem;\n    font-weight: 900;\n    cursor: pointer;\n}\n\n.cut-filter.selected {\n    border-color: rgba(255, 153, 0, 0.5);\n    color: var(--primary-2);\n}\n\n.cut-panel {\n    display: flex;\n    flex-direction: column;\n    min-width: 0;\n    overflow: visible;\n}\n\n.cut-segmented {\n    display: inline-flex;\n    padding: 4px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-3);\n}\n\n.cut-segmented button {\n    min-height: 30px;\n    padding: 0 10px;\n    border: 0;\n    border-radius: 6px;\n    background: transparent;\n    color: var(--muted);\n    font: inherit;\n    font-size: 0.78rem;\n    font-weight: 900;\n    cursor: pointer;\n}\n\n.cut-segmented button.selected {\n    background: #263444;\n    color: var(--text-color);\n}\n\n.cut-calculator {\n    margin-bottom: 16px;\n    padding: 14px;\n    border: 1px solid rgba(255, 153, 0, 0.34);\n    border-radius: 8px;\n    background: linear-gradient(180deg, rgba(255, 153, 0, 0.08), rgba(15, 23, 32, 0.9));\n}\n\n.cut-calculator-header {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n    margin-bottom: 12px;\n}\n\n.cut-calculator-actions {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n}\n\n.cut-calculator-actions .browse-btn {\n    min-height: 44px;\n    padding-inline: 16px;\n    border-color: rgba(56, 189, 248, 0.2);\n    background: linear-gradient(180deg, #27384d, #1b2735);\n}\n\n.cut-calculator-header h3 {\n    margin-bottom: 0;\n    color: var(--text-color);\n    font-size: 0.98rem;\n}\n\n.cut-help-btn,\n.cut-help-close {\n    display: inline-grid;\n    place-items: center;\n    width: 44px;\n    min-width: 44px;\n    height: 44px;\n    border: 1px solid var(--line);\n    border-radius: 999px;\n    background: linear-gradient(180deg, #26384c, #1b2838);\n    color: var(--primary-2);\n    cursor: pointer;\n    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);\n    transition: border-color 0.18s, box-shadow 0.18s, color 0.18s, transform 0.18s;\n}\n\n.cut-help-btn:hover,\n.cut-help-close:hover {\n    border-color: rgba(255, 153, 0, 0.54);\n    color: #ffd38a;\n    transform: translateY(-1px);\n    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.24);\n}\n\n.cut-help-btn:active,\n.cut-help-close:active {\n    transform: translateY(0);\n}\n\n.cut-help-btn:focus-visible,\n.cut-help-close:focus-visible {\n    outline: 2px solid rgba(255, 184, 77, 0.85);\n    outline-offset: 3px;\n}\n\n.cut-help-close {\n    width: 32px;\n    min-width: 32px;\n    height: 32px;\n    color: var(--muted);\n}\n\n.cut-calc-grid {\n    display: grid;\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n    gap: 10px;\n    margin-bottom: 10px;\n}\n\n.cut-calc-grid.count-grid {\n    grid-template-columns: repeat(5, minmax(0, 1fr));\n}\n\n.cut-calc-grid label,\n.cut-calc-grid label {\n    display: grid;\n    gap: 6px;\n    color: #c9d6e2;\n    font-size: 0.72rem;\n    font-weight: 900;\n    letter-spacing: 0.04em;\n    text-transform: uppercase;\n}\n\n.cut-calc-grid input {\n    min-height: 38px;\n    padding: 8px 9px;\n}\n\n.cut-calc-grid select {\n    min-height: 38px;\n    padding: 8px 9px;\n}\n\n.cut-calc-grid select option {\n    background: #0b121a;\n    color: var(--text-color);\n}\n\n.cut-forecast-grid {\n    display: grid;\n    grid-template-columns: repeat(5, minmax(0, 1fr));\n    gap: 10px;\n}\n\n.cut-forecast-card {\n    min-height: 76px;\n    padding: 10px;\n    border: 1px solid var(--line);\n    border-left: 4px solid var(--cyan);\n    border-radius: 8px;\n    background: var(--panel-3);\n}\n\n.cut-forecast-card span,\n.cut-next-action {\n    color: var(--muted);\n    font-size: 0.76rem;\n    font-weight: 800;\n}\n\n.cut-forecast-card strong {\n    display: block;\n    margin-top: 8px;\n    color: var(--cyan);\n    font-size: 1.45rem;\n    line-height: 1;\n}\n\n.cut-forecast-card.warning {\n    border-left-color: var(--red);\n}\n\n.cut-forecast-card.warning strong {\n    color: var(--red);\n}\n\n.cut-forecast-card.safe {\n    border-left-color: var(--green);\n}\n\n.cut-forecast-card.safe strong {\n    color: var(--green);\n}\n\n.cut-next-action {\n    margin-top: 10px;\n    padding: 10px 12px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-3);\n    line-height: 1.35;\n}\n\n.cut-next-action.good {\n    border-color: rgba(74, 222, 128, 0.36);\n    color: var(--green);\n}\n\n.cut-next-action.warning {\n    border-color: rgba(255, 153, 0, 0.4);\n    color: var(--primary-2);\n}\n\n.cut-next-action.danger {\n    border-color: rgba(251, 113, 133, 0.42);\n    color: var(--red);\n}\n\n.cut-explanation-panel {\n    margin-top: 10px;\n    max-height: 460px;\n    overflow-y: auto;\n    padding: 14px;\n    border: 1px solid rgba(34, 211, 238, 0.3);\n    border-radius: 8px;\n    background: rgba(15, 23, 32, 0.92);\n}\n\n.cut-explanation-heading {\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 10px;\n    margin-bottom: 8px;\n}\n\n.cut-explanation-heading strong {\n    color: var(--cyan);\n}\n\n#cut-explanation-.eos-body p {\n    margin: 10px 0 0;\n    color: #c9d6e2;\n    font-size: 0.84rem;\n    line-height: 1.5;\n}\n\n.cut-explanation-grid {\n    display: grid;\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n    gap: 8px;\n    margin: 10px 0;\n}\n\n.cut-explanation-grid div {\n    padding: 9px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: #0b121a;\n}\n\n.cut-explanation-grid span,\n.cut-explanation-grid strong {\n    display: block;\n}\n\n.cut-explanation-grid span {\n    color: var(--muted);\n    font-size: 0.7rem;\n    font-weight: 900;\n    text-transform: uppercase;\n}\n\n.cut-explanation-grid strong {\n    margin-top: 5px;\n    color: var(--cyan);\n    font-size: 1.1rem;\n}\n\n.cut-metric-grid {\n    display: grid;\n    grid-template-columns: repeat(4, minmax(0, 1fr));\n    gap: 12px;\n}\n\n.cut-metric-card {\n    min-height: 116px;\n    padding: 14px;\n    border: 1px solid var(--line);\n    border-left-width: 4px;\n    border-radius: 8px;\n    background: linear-gradient(180deg, #182331, #121a23);\n}\n\n.cut-metric-card i {\n    margin-bottom: 14px;\n    font-size: 1.2rem;\n}\n\n.cut-metric-card strong {\n    display: block;\n    margin-top: 8px;\n    font-size: 1.9rem;\n    line-height: 1;\n}\n\n.cut-metric-card.red {\n    border-left-color: var(--red);\n}\n\n.cut-metric-card.red i,\n.cut-metric-card.red strong {\n    color: var(--red);\n}\n\n.cut-metric-card.orange {\n    border-left-color: var(--primary-color);\n}\n\n.cut-metric-card.orange i,\n.cut-metric-card.orange strong {\n    color: var(--primary-2);\n}\n\n.cut-metric-card.cyan {\n    border-left-color: var(--cyan);\n}\n\n.cut-metric-card.cyan i,\n.cut-metric-card.cyan strong {\n    color: var(--cyan);\n}\n\n.cut-metric-card.green {\n    border-left-color: var(--green);\n}\n\n.cut-metric-card.green i,\n.cut-metric-card.green strong {\n    color: var(--green);\n}\n\n.cut-toolbar {\n    display: grid;\n    grid-template-columns: minmax(280px, 1fr) auto auto;\n    align-items: center;\n    gap: 10px;\n    margin: 16px 0 12px;\n}\n\n.cut-search-box {\n    display: flex;\n    align-items: center;\n    gap: 10px;\n    min-height: 42px;\n    padding: 0 12px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-3);\n    color: var(--muted);\n}\n\n.cut-search-box input {\n    width: 100%;\n    border: 0;\n    outline: 0;\n    background: transparent;\n    color: var(--text-color);\n}\n\n.cut-table-wrap {\n    overflow: auto;\n    flex: 1 1 auto;\n    min-height: 260px;\n    max-height: calc(100vh - 430px);\n    border: 1px solid var(--line);\n    border-radius: 8px;\n}\n\n.cut-table {\n    width: 100%;\n    min-width: 1120px;\n    border-collapse: collapse;\n}\n\n.cut-table th,\n.cut-table td {\n    padding: 12px 13px;\n    border-bottom: 1px solid var(--line);\n    text-align: left;\n    vertical-align: middle;\n}\n\n.cut-table th {\n    position: sticky;\n    top: 0;\n    z-index: 2;\n    background: #1d2a38;\n    color: var(--primary-2);\n    font-size: 0.74rem;\n    font-weight: 900;\n    letter-spacing: 0.05em;\n    text-transform: uppercase;\n}\n\n.cut-table tbody tr {\n    background: rgba(15, 23, 32, 0.72);\n}\n\n.cut-table tbody tr:hover {\n    background: rgba(255, 255, 255, 0.04);\n}\n\n.cut-table td strong,\n.cut-table td span {\n    display: block;\n}\n\n.cut-table td span {\n    margin-top: 3px;\n    color: var(--muted);\n    font-size: 0.76rem;\n}\n\n.cut-rank {\n    display: inline-grid !important;\n    place-items: center;\n    width: 30px;\n    height: 30px;\n    border-radius: 999px;\n    background: #263444;\n    color: var(--text-color) !important;\n    font-weight: 900;\n}\n\n.cut-table tr.risk-high {\n    box-shadow: inset 4px 0 0 var(--red);\n}\n\n.cut-table tr.risk-soon {\n    box-shadow: inset 4px 0 0 var(--primary-color);\n}\n\n.cut-type-pill,\n.cut-source {\n    display: inline-flex !important;\n    align-items: center;\n    justify-content: center;\n    width: fit-content;\n    min-height: 26px;\n    padding: 4px 8px;\n    border-radius: 999px;\n    font-size: 0.72rem !important;\n    font-weight: 900;\n}\n\n.cut-type-pill.vendor,\n.cut-type-pill.live {\n    background: rgba(255, 153, 0, 0.14);\n    color: var(--primary-2) !important;\n}\n\n.cut-type-pill.transship {\n    background: rgba(34, 211, 238, 0.12);\n    color: var(--cyan) !important;\n}\n\n.cut-type-pill.parcel {\n    background: rgba(167, 139, 250, 0.15);\n    color: var(--violet) !important;\n}\n\n.cut-type-pill.other {\n    background: rgba(148, 163, 184, 0.14);\n    color: var(--muted) !important;\n}\n\n.cut-source.good {\n    background: rgba(34, 197, 94, 0.13);\n    color: var(--green) !important;\n}\n\n.cut-source.warn {\n    background: rgba(255, 153, 0, 0.13);\n    color: var(--primary-2) !important;\n}\n\n.cut-action-card {\n    display: flex;\n    gap: 12px;\n    margin-bottom: 12px;\n    padding: 12px;\n    border: 1px solid var(--line);\n    border-radius: 8px;\n    background: var(--panel-2);\n}\n\n.cut-action-card i {\n    margin-top: 2px;\n    color: var(--cyan);\n}\n\n.cut-action-card strong,\n.cut-action-card span {\n    display: block;\n}\n\n.cut-action-card span {\n    margin-top: 4px;\n}\n\n.cut-action-card.urgent {\n    border-color: rgba(251, 113, 133, 0.38);\n    background: rgba(251, 113, 133, 0.1);\n}\n\n.cut-action-card.urgent i {\n    color: var(--red);\n}\n\n.hub-grid textarea {\n    min-height: 250px;\n    padding: 10px;\n    font-family: Consolas, \"Courier New\", monospace;\n    resize: vertical;\n}\n\n.modal-actions {\n    display: flex;\n    justify-content: flex-end;\n    gap: 10px;\n    margin-top: 20px;\n}\n\n#scan-overlay {\n    position: fixed;\n    inset: 0;\n    z-index: 9999;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    padding: 28px;\n    background: rgba(245, 247, 250, 0.98);\n}\n\n.scan-content {\n    width: min(900px, 100%);\n    color: #1f2937;\n    text-align: center;\n}\n\n.scan-content h2 {\n    margin-bottom: 10px;\n    font-size: 1.35rem;\n}\n\n.scan-content p {\n    color: #5b6572;\n}\n\n.giant-barcode-wrapper {\n    margin: 30px auto;\n    padding: 20px;\n    border: 2px dashed #cbd5e1;\n    border-radius: 8px;\n    background: #ffffff;\n    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);\n}\n\n#giant-barcode {\n    width: 100%;\n    height: auto;\n    max-height: 400px;\n}\n\n.scan-controls {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    gap: 24px;\n}\n\n#scan-progress {\n    min-width: 90px;\n    color: #1f2937;\n    font-size: 1.1rem;\n    font-weight: 900;\n}\n\n.nav-btn {\n    background: #1f2937;\n    color: #ffffff;\n}\n\n.close-overlay {\n    position: absolute;\n    top: 20px;\n    right: 20px;\n    background: #ef4444;\n    color: #ffffff;\n}\n\nfooter {\n    padding: 12px 18px 16px;\n    color: rgba(238, 244, 248, 0.42);\n    font-size: 0.78rem;\n    text-align: center;\n}\n\n@media print {\n    .eos-body * {\n        visibility: hidden;\n    }\n\n    #printable-area,\n    #printable-area * {\n        visibility: visible;\n    }\n\n    #printable-area {\n        position: absolute;\n        top: 0;\n        left: 0;\n        width: 100%;\n        margin: 0;\n        padding: 20px;\n        background: #ffffff !important;\n        color: #000000 !important;\n    }\n\n    .barcode-wrapper {\n        display: inline-block;\n        width: 30%;\n        margin-bottom: 30px;\n        border: 0;\n        text-align: center;\n        page-break-inside: avoid;\n    }\n}\n\n@media (max-width: 1240px) {\n    .console-grid {\n        grid-template-columns: minmax(260px, var(--side-column)) minmax(0, 1fr);\n    }\n\n    .cut-shell {\n        grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);\n    }\n\n    .priority-panel {\n        grid-column: 1 / -1;\n    }\n\n    .priority-stack {\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n    }\n\n    .parcel-grid {\n        grid-template-columns: repeat(3, minmax(0, 1fr));\n    }\n}\n\n@media (max-width: 940px) {\n    .app-header,\n    #action-panel {\n        align-items: stretch;\n        flex-direction: column;\n    }\n\n    .user-info,\n    .status-actions {\n        flex-wrap: wrap;\n    }\n\n    .console-grid,\n    .tool-split,\n    .hub-grid,\n    .cut-shell,\n    .cut-viewbar,\n    .cut-toolbar,\n    .cut-calc-grid,\n    .cut-calc-grid.count-grid,\n    .cut-forecast-grid {\n        grid-template-columns: 1fr;\n    }\n\n    .cut-viewbar-actions,\n    .cut-calculator-header,\n    .cut-calculator-actions {\n        flex-wrap: wrap;\n    }\n\n    .cut-panel {\n        max-height: none;\n        overflow: visible;\n    }\n\n    .cut-table-wrap {\n        max-height: 62vh;\n    }\n\n    .metrics-grid,\n    .parcel-grid,\n    .priority-stack,\n    .cut-metric-grid {\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n    }\n}\n\n@media (max-width: 620px) {\n    main {\n        padding-inline: 14px;\n    }\n\n    .app-header {\n        padding-inline: 14px;\n    }\n\n    .upload-card,\n    .metrics-grid,\n    .parcel-grid,\n    .priority-stack,\n    .barcode-controls,\n    .cut-metric-grid,\n    .cut-forecast-grid,\n    .cut-explanation-grid {\n        grid-template-columns: 1fr;\n    }\n\n    .file-card-actions {\n        flex-direction: column;\n    }\n\n    .status-actions,\n    .tool-actions,\n    .modal-actions,\n    .scan-controls,\n    .cut-viewbar-actions {\n        align-items: stretch;\n        flex-direction: column;\n    }\n\n    .browse-btn,\n    .btn-warning,\n    .nav-btn {\n        width: 100%;\n    }\n}\n";
    const icons = {"arrow-left":{"width":448,"height":512,"path":"M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.2 288 416 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-306.7 0L214.6 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"},"barcode":{"width":512,"height":512,"path":"M24 32C10.7 32 0 42.7 0 56V456c0 13.3 10.7 24 24 24H40c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H24zm88 0c-8.8 0-16 7.2-16 16V464c0 8.8 7.2 16 16 16s16-7.2 16-16V48c0-8.8-7.2-16-16-16zm72 0c-13.3 0-24 10.7-24 24V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H184zm96 0c-13.3 0-24 10.7-24 24V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H280zM448 56V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H472c-13.3 0-24 10.7-24 24zm-64-8V464c0 8.8 7.2 16 16 16s16-7.2 16-16V48c0-8.8-7.2-16-16-16s-16 7.2-16 16z"},"box-open":{"width":640,"height":512,"path":"M58.9 42.1c3-6.1 9.6-9.6 16.3-8.7L320 64 564.8 33.4c6.7-.8 13.3 2.7 16.3 8.7l41.7 83.4c9 17.9-.6 39.6-19.8 45.1L439.6 217.3c-13.9 4-28.8-1.9-36.2-14.3L320 64 236.6 203c-7.4 12.4-22.3 18.3-36.2 14.3L37.1 170.6c-19.3-5.5-28.8-27.2-19.8-45.1L58.9 42.1zM321.1 128l54.9 91.4c14.9 24.8 44.6 36.6 72.5 28.6L576 211.6v167c0 22-15 41.2-36.4 46.6l-204.1 51c-10.2 2.6-20.9 2.6-31 0l-204.1-51C79 419.7 64 400.5 64 378.5v-167L191.6 248c27.8 8 57.6-3.8 72.5-28.6L318.9 128h2.2z"},"boxes":{"width":576,"height":512,"path":"M248 0H208c-26.5 0-48 21.5-48 48V160c0 35.3 28.7 64 64 64H352c35.3 0 64-28.7 64-64V48c0-26.5-21.5-48-48-48H328V80c0 8.8-7.2 16-16 16H264c-8.8 0-16-7.2-16-16V0zM64 256c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H224c35.3 0 64-28.7 64-64V320c0-35.3-28.7-64-64-64H184v80c0 8.8-7.2 16-16 16H120c-8.8 0-16-7.2-16-16V256H64zM352 512H512c35.3 0 64-28.7 64-64V320c0-35.3-28.7-64-64-64H472v80c0 8.8-7.2 16-16 16H408c-8.8 0-16-7.2-16-16V256H352c-15 0-28.8 5.1-39.7 13.8c4.9 10.4 7.7 22 7.7 34.2V464c0 12.2-2.8 23.8-7.7 34.2C323.2 506.9 337 512 352 512z"},"calculator":{"width":384,"height":512,"path":"M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64zM96 64H288c17.7 0 32 14.3 32 32v32c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V96c0-17.7 14.3-32 32-32zm32 160a32 32 0 1 1 -64 0 32 32 0 1 1 64 0zM96 352a32 32 0 1 1 0-64 32 32 0 1 1 0 64zM64 416c0-17.7 14.3-32 32-32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H96c-17.7 0-32-14.3-32-32zM192 256a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm32 64a32 32 0 1 1 -64 0 32 32 0 1 1 64 0zm64-64a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm32 64a32 32 0 1 1 -64 0 32 32 0 1 1 64 0zM288 448a32 32 0 1 1 0-64 32 32 0 1 1 0 64z"},"chevron-left":{"width":320,"height":512,"path":"M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"},"chevron-right":{"width":320,"height":512,"path":"M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"},"check-circle":{"width":512,"height":512,"path":"M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"},"circle-info":{"width":512,"height":512,"path":"M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"},"info-circle":{"width":512,"height":512,"path":"M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"},"circle-question":{"width":512,"height":512,"path":"M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM169.8 165.3c7.9-22.3 29.1-37.3 52.8-37.3h58.3c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24V250.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1H222.6c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"},"times-circle":{"width":512,"height":512,"path":"M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"},"clock":{"width":512,"height":512,"path":"M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"},"copy":{"width":448,"height":512,"path":"M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z"},"database":{"width":448,"height":512,"path":"M448 80v48c0 44.2-100.3 80-224 80S0 172.2 0 128V80C0 35.8 100.3 0 224 0S448 35.8 448 80zM393.2 214.7c20.8-7.4 39.9-16.9 54.8-28.6V288c0 44.2-100.3 80-224 80S0 332.2 0 288V186.1c14.9 11.8 34 21.2 54.8 28.6C99.7 230.7 159.5 240 224 240s124.3-9.3 169.2-25.3zM0 346.1c14.9 11.8 34 21.2 54.8 28.6C99.7 390.7 159.5 400 224 400s124.3-9.3 169.2-25.3c20.8-7.4 39.9-16.9 54.8-28.6V432c0 44.2-100.3 80-224 80S0 476.2 0 432V346.1z"},"door-open":{"width":576,"height":512,"path":"M320 32c0-9.9-4.5-19.2-12.3-25.2S289.8-1.4 280.2 1l-179.9 45C79 51.3 64 70.5 64 92.5V448H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H96 288h32V480 32zM256 256c0 17.7-10.7 32-24 32s-24-14.3-24-32s10.7-32 24-32s24 14.3 24 32zm96-128h96V480c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H512V128c0-35.3-28.7-64-64-64H352v64z"},"expand":{"width":448,"height":512,"path":"M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64V352zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM448 352c0-17.7-14.3-32-32-32s-32 14.3-32 32v64H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32V352z"},"file-csv":{"width":512,"height":512,"path":"M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V304H176c-35.3 0-64 28.7-64 64V512H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128zM200 352h16c22.1 0 40 17.9 40 40v8c0 8.8-7.2 16-16 16s-16-7.2-16-16v-8c0-4.4-3.6-8-8-8H200c-4.4 0-8 3.6-8 8v80c0 4.4 3.6 8 8 8h16c4.4 0 8-3.6 8-8v-8c0-8.8 7.2-16 16-16s16 7.2 16 16v8c0 22.1-17.9 40-40 40H200c-22.1 0-40-17.9-40-40V392c0-22.1 17.9-40 40-40zm133.1 0H368c8.8 0 16 7.2 16 16s-7.2 16-16 16H333.1c-7.2 0-13.1 5.9-13.1 13.1c0 5.2 3 9.9 7.8 12l37.4 16.6c16.3 7.2 26.8 23.4 26.8 41.2c0 24.9-20.2 45.1-45.1 45.1H304c-8.8 0-16-7.2-16-16s7.2-16 16-16h42.9c7.2 0 13.1-5.9 13.1-13.1c0-5.2-3-9.9-7.8-12l-37.4-16.6c-16.3-7.2-26.8-23.4-26.8-41.2c0-24.9 20.2-45.1 45.1-45.1zm98.9 0c8.8 0 16 7.2 16 16v31.6c0 23 5.5 45.6 16 66c10.5-20.3 16-42.9 16-66V368c0-8.8 7.2-16 16-16s16 7.2 16 16v31.6c0 34.7-10.3 68.7-29.6 97.6l-5.1 7.7c-3 4.5-8 7.1-13.3 7.1s-10.3-2.7-13.3-7.1l-5.1-7.7c-19.3-28.9-29.6-62.9-29.6-97.6V368c0-8.8 7.2-16 16-16z"},"file-export":{"width":576,"height":512,"path":"M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V288H216c-13.3 0-24 10.7-24 24s10.7 24 24 24H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zM384 336V288H494.1l-39-39c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l80 80c9.4 9.4 9.4 24.6 0 33.9l-80 80c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l39-39H384zm0-208H256V0L384 128z"},"fire":{"width":448,"height":512,"path":"M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z"},"hand-pointer":{"width":448,"height":512,"path":"M128 40c0-22.1 17.9-40 40-40s40 17.9 40 40V188.2c8.5-7.6 19.7-12.2 32-12.2c20.6 0 38.2 13 45 31.2c8.8-9.3 21.2-15.2 35-15.2c25.3 0 46 19.5 47.9 44.3c8.5-7.7 19.8-12.3 32.1-12.3c26.5 0 48 21.5 48 48v48 16 48c0 70.7-57.3 128-128 128l-16 0H240l-.1 0h-5.2c-5 0-9.9-.3-14.7-1c-55.3-5.6-106.2-34-140-79L8 336c-13.3-17.7-9.7-42.7 8-56s42.7-9.7 56 8l56 74.7V40zM240 304c0-8.8-7.2-16-16-16s-16 7.2-16 16v96c0 8.8 7.2 16 16 16s16-7.2 16-16V304zm48-16c-8.8 0-16 7.2-16 16v96c0 8.8 7.2 16 16 16s16-7.2 16-16V304c0-8.8-7.2-16-16-16zm80 16c0-8.8-7.2-16-16-16s-16 7.2-16 16v96c0 8.8 7.2 16 16 16s16-7.2 16-16V304z"},"handshake":{"width":640,"height":512,"path":"M323.4 85.2l-96.8 78.4c-16.1 13-19.2 36.4-7 53.1c12.9 17.8 38 21.3 55.3 7.8l99.3-77.2c7-5.4 17-4.2 22.5 2.8s4.2 17-2.8 22.5l-20.9 16.2L512 316.8V128h-.7l-3.9-2.5L434.8 79c-15.3-9.8-33.2-15-51.4-15c-21.8 0-43 7.5-60 21.2zm22.8 124.4l-51.7 40.2C263 274.4 217.3 268 193.7 235.6c-22.2-30.5-16.6-73.1 12.7-96.8l83.2-67.3c-11.6-4.9-24.1-7.4-36.8-7.4C234 64 215.7 69.6 200 80l-72 48V352h28.2l91.4 83.4c19.6 17.9 49.9 16.5 67.8-3.1c5.5-6.1 9.2-13.2 11.1-20.6l17 15.6c19.5 17.9 49.9 16.6 67.8-2.9c4.5-4.9 7.8-10.6 9.9-16.5c19.4 13 45.8 10.3 62.1-7.5c17.9-19.5 16.6-49.9-2.9-67.8l-134.2-123zM16 128c-8.8 0-16 7.2-16 16V352c0 17.7 14.3 32 32 32H64c17.7 0 32-14.3 32-32V128H16zM48 320a16 16 0 1 1 0 32 16 16 0 1 1 0-32zM544 128V352c0 17.7 14.3 32 32 32h32c17.7 0 32-14.3 32-32V144c0-8.8-7.2-16-16-16H544zm32 208a16 16 0 1 1 32 0 16 16 0 1 1 -32 0z"},"hourglass-half":{"width":384,"height":512,"path":"M32 0C14.3 0 0 14.3 0 32S14.3 64 32 64V75c0 42.4 16.9 83.1 46.9 113.1L146.7 256 78.9 323.9C48.9 353.9 32 394.6 32 437v11c-17.7 0-32 14.3-32 32s14.3 32 32 32H64 320h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V437c0-42.4-16.9-83.1-46.9-113.1L237.3 256l67.9-67.9c30-30 46.9-70.7 46.9-113.1V64c17.7 0 32-14.3 32-32s-14.3-32-32-32H320 64 32zM96 75V64H288V75c0 19-5.6 37.4-16 53H112c-10.3-15.6-16-34-16-53zm16 309c3.5-5.3 7.6-10.3 12.1-14.9L192 301.3l67.9 67.9c4.6 4.6 8.6 9.6 12.1 14.9H112z"},"id-badge":{"width":384,"height":512,"path":"M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V64c0-35.3-28.7-64-64-64H64zm96 320h64c44.2 0 80 35.8 80 80c0 8.8-7.2 16-16 16H96c-8.8 0-16-7.2-16-16c0-44.2 35.8-80 80-80zm-32-96a64 64 0 1 1 128 0 64 64 0 1 1 -128 0zM144 64h96c8.8 0 16 7.2 16 16s-7.2 16-16 16H144c-8.8 0-16-7.2-16-16s7.2-16 16-16z"},"keyboard":{"width":576,"height":512,"path":"M64 64C28.7 64 0 92.7 0 128V384c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H64zm16 64h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16zM64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm16 80h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V336c0-8.8 7.2-16 16-16zm80-176c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V144zm16 80h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zM160 336c0-8.8 7.2-16 16-16H400c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V336zM272 128h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16zM256 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H272c-8.8 0-16-7.2-16-16V240zM368 128h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H368c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16zM352 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H368c-8.8 0-16-7.2-16-16V240zM464 128h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H464c-8.8 0-16-7.2-16-16V144c0-8.8 7.2-16 16-16zM448 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H464c-8.8 0-16-7.2-16-16V240zm16 80h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H464c-8.8 0-16-7.2-16-16V336c0-8.8 7.2-16 16-16z"},"laptop-code":{"width":640,"height":512,"path":"M64 96c0-35.3 28.7-64 64-64H512c35.3 0 64 28.7 64 64V352H512V96H128V352H64V96zM0 403.2C0 392.6 8.6 384 19.2 384H620.8c10.6 0 19.2 8.6 19.2 19.2c0 42.4-34.4 76.8-76.8 76.8H76.8C34.4 480 0 445.6 0 403.2zM281 209l-31 31 31 31c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-48-48c-9.4-9.4-9.4-24.6 0-33.9l48-48c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9zM393 175l48 48c9.4 9.4 9.4 24.6 0 33.9l-48 48c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l31-31-31-31c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z"},"list":{"width":512,"height":512,"path":"M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"},"search":{"width":512,"height":512,"path":"M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"},"search-plus":{"width":512,"height":512,"path":"M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM184 296c0 13.3 10.7 24 24 24s24-10.7 24-24V232h64c13.3 0 24-10.7 24-24s-10.7-24-24-24H232V120c0-13.3-10.7-24-24-24s-24 10.7-24 24v64H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z"},"network-wired":{"width":640,"height":512,"path":"M256 64H384v64H256V64zM240 0c-26.5 0-48 21.5-48 48v96c0 26.5 21.5 48 48 48h48v32H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96v32H80c-26.5 0-48 21.5-48 48v96c0 26.5 21.5 48 48 48H240c26.5 0 48-21.5 48-48V368c0-26.5-21.5-48-48-48H192V288H448v32H400c-26.5 0-48 21.5-48 48v96c0 26.5 21.5 48 48 48H560c26.5 0 48-21.5 48-48V368c0-26.5-21.5-48-48-48H512V288h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H352V192h48c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H240zM96 448V384H224v64H96zm320-64H544v64H416V384z"},"pallet":{"width":640,"height":512,"path":"M32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32H64v64H32c-17.7 0-32 14.3-32 32s14.3 32 32 32H96 320 544h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H576V384h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H544 320 96 32zm96 64H288v64H128V384zm224 0H512v64H352V384z"},"plug-circle-bolt":{"width":576,"height":512,"path":"M96 0C78.3 0 64 14.3 64 32v96h64V32c0-17.7-14.3-32-32-32zM288 0c-17.7 0-32 14.3-32 32v96h64V32c0-17.7-14.3-32-32-32zM32 160c-17.7 0-32 14.3-32 32s14.3 32 32 32v32c0 77.4 55 142 128 156.8V480c0 17.7 14.3 32 32 32s32-14.3 32-32V412.8c12.3-2.5 24.1-6.4 35.1-11.5c-2.1-10.8-3.1-21.9-3.1-33.3c0-80.3 53.8-148 127.3-169.2c.5-2.2 .7-4.5 .7-6.8c0-17.7-14.3-32-32-32H32zM432 512a144 144 0 1 0 0-288 144 144 0 1 0 0 288zm47.9-225c4.3 3.7 5.4 9.9 2.6 14.9L452.4 356H488c5.2 0 9.8 3.3 11.4 8.2s-.1 10.3-4.2 13.4l-96 72c-4.5 3.4-10.8 3.2-15.1-.6s-5.4-9.9-2.6-14.9L411.6 380H376c-5.2 0-9.8-3.3-11.4-8.2s.1-10.3 4.2-13.4l96-72c4.5-3.4 10.8-3.2 15.1 .6z"},"print":{"width":512,"height":512,"path":"M128 0C92.7 0 64 28.7 64 64v96h64V64H354.7L384 93.3V160h64V93.3c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0H128zM384 352v32 64H128V384 368 352H384zm64 32h32c17.7 0 32-14.3 32-32V256c0-35.3-28.7-64-64-64H64c-35.3 0-64 28.7-64 64v96c0 17.7 14.3 32 32 32H64v64c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V384zM432 248a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"},"question":{"width":320,"height":512,"path":"M80 160c0-35.3 28.7-64 64-64h32c35.3 0 64 28.7 64 64v3.6c0 21.8-11.1 42.1-29.4 53.8l-42.2 27.1c-25.2 16.2-40.4 44.1-40.4 74V320c0 17.7 14.3 32 32 32s32-14.3 32-32v-1.4c0-8.2 4.2-15.8 11-20.2l42.2-27.1c36.6-23.6 58.8-64.1 58.8-107.7V160c0-70.7-57.3-128-128-128H144C73.3 32 16 89.3 16 160c0 17.7 14.3 32 32 32s32-14.3 32-32zm80 320a40 40 0 1 0 0-80 40 40 0 1 0 0 80z"},"exchange-alt":{"width":512,"height":512,"path":"M32 96l320 0V32c0-12.9 7.8-24.6 19.8-29.6s25.7-2.2 34.9 6.9l96 96c6 6 9.4 14.1 9.4 22.6s-3.4 16.6-9.4 22.6l-96 96c-9.2 9.2-22.9 11.9-34.9 6.9s-19.8-16.6-19.8-29.6V160L32 160c-17.7 0-32-14.3-32-32s14.3-32 32-32zM480 352c17.7 0 32 14.3 32 32s-14.3 32-32 32H160v64c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-96-96c-6-6-9.4-14.1-9.4-22.6s3.4-16.6 9.4-22.6l96-96c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 64H480z"},"rotate":{"width":512,"height":512,"path":"M142.9 142.9c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5c0 0 0 0 0 0H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5c7.7-21.8 20.2-42.3 37.8-59.8zM16 312v7.6 .7V440c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2l41.6-41.6c87.6 86.5 228.7 86.2 315.8-1c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.2 62.2-162.7 62.5-225.3 1L185 329c6.9-6.9 8.9-17.2 5.2-26.2s-12.5-14.8-22.2-14.8H48.4h-.7H40c-13.3 0-24 10.7-24 24z"},"sync-alt":{"width":512,"height":512,"path":"M142.9 142.9c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5c0 0 0 0 0 0H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5c7.7-21.8 20.2-42.3 37.8-59.8zM16 312v7.6 .7V440c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2l41.6-41.6c87.6 86.5 228.7 86.2 315.8-1c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.2 62.2-162.7 62.5-225.3 1L185 329c6.9-6.9 8.9-17.2 5.2-26.2s-12.5-14.8-22.2-14.8H48.4h-.7H40c-13.3 0-24 10.7-24 24z"},"ruler-combined":{"width":512,"height":512,"path":"M.2 468.9C2.7 493.1 23.1 512 48 512l96 0 320 0c26.5 0 48-21.5 48-48l0-96c0-26.5-21.5-48-48-48l-48 0 0 80c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-80-64 0 0 80c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-80-64 0 0 80c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-80-80 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l80 0 0-64-80 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l80 0 0-64-80 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l80 0 0-48c0-26.5-21.5-48-48-48L48 0C21.5 0 0 21.5 0 48L0 368l0 96c0 1.7 .1 3.3 .2 4.9z"},"sort":{"width":320,"height":512,"path":"M137.4 41.4c12.5-12.5 32.8-12.5 45.3 0l128 128c9.2 9.2 11.9 22.9 6.9 34.9s-16.6 19.8-29.6 19.8H32c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9l128-128zm0 429.3l-128-128c-9.2-9.2-11.9-22.9-6.9-34.9s16.6-19.8 29.6-19.8H288c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9l-128 128c-12.5 12.5-32.8 12.5-45.3 0z"},"parking":{"width":448,"height":512,"path":"M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zM192 256h48c17.7 0 32-14.3 32-32s-14.3-32-32-32H192v64zm48 64H192v32c0 17.7-14.3 32-32 32s-32-14.3-32-32V288 168c0-22.1 17.9-40 40-40h72c53 0 96 43 96 96s-43 96-96 96z"},"trash":{"width":448,"height":512,"path":"M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"},"triangle-exclamation":{"width":512,"height":512,"path":"M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"},"exclamation-triangle":{"width":512,"height":512,"path":"M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"},"shipping-fast":{"width":640,"height":512,"path":"M112 0C85.5 0 64 21.5 64 48V96H16c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 272c8.8 0 16 7.2 16 16s-7.2 16-16 16H64 48c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 240c8.8 0 16 7.2 16 16s-7.2 16-16 16H64 16c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 208c8.8 0 16 7.2 16 16s-7.2 16-16 16H64V416c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H112zM544 237.3V256H416V160h50.7L544 237.3zM160 368a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm272 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0z"},"truck-ramp-box":{"width":640,"height":512,"path":"M640 0V400c0 61.9-50.1 112-112 112c-61 0-110.5-48.7-112-109.3L48.4 502.9c-17.1 4.6-34.6-5.4-39.3-22.5s5.4-34.6 22.5-39.3L352 353.8V64c0-35.3 28.7-64 64-64H640zM576 400a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM23.1 207.7c-4.6-17.1 5.6-34.6 22.6-39.2l46.4-12.4 20.7 77.3c2.3 8.5 11.1 13.6 19.6 11.3l30.9-8.3c8.5-2.3 13.6-11.1 11.3-19.6l-20.7-77.3 46.4-12.4c17.1-4.6 34.6 5.6 39.2 22.6l41.4 154.5c4.6 17.1-5.6 34.6-22.6 39.2L103.7 384.9c-17.1 4.6-34.6-5.6-39.2-22.6L23.1 207.7z"},"truck-loading":{"width":640,"height":512,"path":"M640 0V400c0 61.9-50.1 112-112 112c-61 0-110.5-48.7-112-109.3L48.4 502.9c-17.1 4.6-34.6-5.4-39.3-22.5s5.4-34.6 22.5-39.3L352 353.8V64c0-35.3 28.7-64 64-64H640zM576 400a48 48 0 1 0 -96 0 48 48 0 1 0 96 0zM23.1 207.7c-4.6-17.1 5.6-34.6 22.6-39.2l46.4-12.4 20.7 77.3c2.3 8.5 11.1 13.6 19.6 11.3l30.9-8.3c8.5-2.3 13.6-11.1 11.3-19.6l-20.7-77.3 46.4-12.4c17.1-4.6 34.6 5.6 39.2 22.6l41.4 154.5c4.6 17.1-5.6 34.6-22.6 39.2L103.7 384.9c-17.1 4.6-34.6-5.6-39.2-22.6L23.1 207.7z"},"user-clock":{"width":640,"height":512,"path":"M224 0a128 128 0 1 1 0 256A128 128 0 1 1 224 0zM178.3 304h91.4c20.6 0 40.4 3.5 58.8 9.9C323 331 320 349.1 320 368c0 59.5 29.5 112.1 74.8 144H29.7C13.3 512 0 498.7 0 482.3C0 383.8 79.8 304 178.3 304zM352 368a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-80c-8.8 0-16 7.2-16 16v64c0 8.8 7.2 16 16 16h48c8.8 0 16-7.2 16-16s-7.2-16-16-16H512V304c0-8.8-7.2-16-16-16z"},"wand-magic-sparkles":{"width":576,"height":512,"path":"M234.7 42.7L197 56.8c-3 1.1-5 4-5 7.2s2 6.1 5 7.2l37.7 14.1L248.8 123c1.1 3 4 5 7.2 5s6.1-2 7.2-5l14.1-37.7L315 71.2c3-1.1 5-4 5-7.2s-2-6.1-5-7.2L277.3 42.7 263.2 5c-1.1-3-4-5-7.2-5s-6.1 2-7.2 5L234.7 42.7zM46.1 395.4c-18.7 18.7-18.7 49.1 0 67.9l34.6 34.6c18.7 18.7 49.1 18.7 67.9 0L529.9 116.5c18.7-18.7 18.7-49.1 0-67.9L495.3 14.1c-18.7-18.7-49.1-18.7-67.9 0L46.1 395.4zM484.6 82.6l-105 105-23.3-23.3 105-105 23.3 23.3zM7.5 117.2C3 118.9 0 123.2 0 128s3 9.1 7.5 10.8L64 160l21.2 56.5c1.7 4.5 6 7.5 10.8 7.5s9.1-3 10.8-7.5L128 160l56.5-21.2c4.5-1.7 7.5-6 7.5-10.8s-3-9.1-7.5-10.8L128 96 106.8 39.5C105.1 35 100.8 32 96 32s-9.1 3-10.8 7.5L64 96 7.5 117.2zm352 256c-4.5 1.7-7.5 6-7.5 10.8s3 9.1 7.5 10.8L416 416l21.2 56.5c1.7 4.5 6 7.5 10.8 7.5s9.1-3 10.8-7.5L480 416l56.5-21.2c4.5-1.7 7.5-6 7.5-10.8s-3-9.1-7.5-10.8L480 352l-21.2-56.5c-1.7-4.5-6-7.5-10.8-7.5s-9.1 3-10.8 7.5L416 352l-56.5 21.2z"},"xmark":{"width":384,"height":512,"path":"M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"}};
    const storageKey = 'gyr2-eos-browser-test-v1';
    let overlay;

    function installEosIcons(root, document, icons) {
    function update(node) {
        const elements = [];
        if (node.nodeType === 1 && node.matches('i.fas, i.far, i.fa')) elements.push(node);
        if (node.querySelectorAll) elements.push(...node.querySelectorAll('i.fas, i.far, i.fa'));
        for (const element of elements) {
            const name = [...element.classList].map(value => value.replace(/^fa-/, '')).find(value => icons[value]);
            if (!name || element.dataset.eosIcon === name && element.firstChild) continue;
            const icon = icons[name];
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', `0 0 ${icon.width} ${icon.height}`);
            svg.setAttribute('width', '1em');
            svg.setAttribute('height', '1em');
            svg.setAttribute('fill', 'currentColor');
            svg.setAttribute('aria-hidden', 'true');
            for (const shape of Array.isArray(icon.path) ? icon.path : [icon.path]) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', shape);
                svg.appendChild(path);
            }
            element.replaceChildren(svg);
            element.dataset.eosIcon = name;
        }
    }
    update(root);
    const observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') update(record.target);
            else record.addedNodes.forEach(update);
        }
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    return observer;
}

    // Builds only EOS's controlled templates through DOM APIs. No HTML/script injection sinks.
function replaceEosMarkup(target, markup) {
    const document = target.ownerDocument;
    const fragment = document.createDocumentFragment();
    const stack = [fragment];
    const tags = new Set('div span p strong b small header footer main section aside article h1 h2 h3 h4 label button input textarea select option optgroup table thead tbody tr td th i fieldset legend br hr ul ol li pre dialog svg'.split(' '));
    const voidTags = new Set(['input', 'br', 'hr']);
    const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', times: '\u00d7' };
    const decode = value => value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (original, code) => {
        if (code[0] !== '#') return entities[code.toLowerCase()] ?? original;
        const number = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '\ufffd';
    });
    const tokens = String(markup).match(/<!--[\s\S]*?-->|<\/?[a-z][\w:-]*(?:"[^"]*"|'[^']*'|[^'">])*\/?>|[^<]+|</gi) || [];
    for (const token of tokens) {
        if (token.startsWith('<!--')) continue;
        const tag = token.match(/^<(\/?)([a-z][\w:-]*)\b/i);
        if (!tag) { stack[stack.length - 1].appendChild(document.createTextNode(decode(token))); continue; }
        const name = tag[2].toLowerCase();
        if (!tags.has(name)) throw new Error(`Unsupported EOS template tag: ${name}`);
        if (tag[1]) {
            if (stack.length < 2 || stack[stack.length - 1].localName !== name) throw new Error(`Unbalanced EOS template: ${name}`);
            stack.pop();
            continue;
        }
        const element = name === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', name) : document.createElement(name);
        const attributes = token.slice(tag[0].length).replace(/\/?\s*>$/, '');
        for (const match of attributes.matchAll(/([^\s=/'">]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
            const key = match[1].toLowerCase();
            const value = decode(match[2] ?? match[3] ?? match[4] ?? '');
            if (/^on/.test(key) || ['src', 'srcdoc', 'href', 'action', 'formaction', 'is'].includes(key)) throw new Error(`Unsupported EOS template attribute: ${key}`);
            if (key === 'style') element.style.cssText = value;
            else element.setAttribute(key, value);
        }
        stack[stack.length - 1].appendChild(element);
        if (!voidTags.has(name) && !/\/\s*>$/.test(token)) stack.push(element);
    }
    if (stack.length !== 1) throw new Error('Unclosed EOS template tag');
    target.replaceChildren(fragment);
}


    function runApp(window, document, parent, sessionStorage) {
        (function () {
    'use strict';
    const boot = window.__EOS_BOOT__;
    const values = { ...boot.values };
    const files = new Map();
    const pending = new Map();
    let sequence = 0;
    const send = (action, extra = {}) => parent.postMessage({ eosChannel: boot.channel, action, ...extra }, '*');

    window.eosStorage = {
        getItem: key => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
        setItem(key, value) {
            values[key] = String(value);
            send('storage', { key, value: String(value) });
        },
        removeItem(key) { delete values[key]; send('storage', { key, value: null }); }
    };

    function warning(message) {
        let box = document.getElementById('browser-warning');
        if (!box) {
            box = document.createElement('div');
            box.id = 'browser-warning';
            box.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:99999;background:#fff4d6;color:#392700;border:2px solid #e9ae32;padding:12px;white-space:pre-wrap';
            document.body.appendChild(box);
        }
        box.textContent = message;
        box.onclick = () => box.remove();
    }
    window.addEventListener('message', event => {
        if (event.source !== parent || event.data?.eosChannel !== boot.channel) return;
        if (event.data.action === 'warning') warning(event.data.message);
        const resolve = pending.get(event.data.id);
        if (resolve) { pending.delete(event.data.id); resolve(event.data); }
    });

    function download(content, name) {
        const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    window.api = {
        openFile: () => new Promise(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv,text/csv';
            input.hidden = true;
            input.dataset.eosFilePicker = 'true';
            const finish = file => {
                input.remove();
                if (!file) return resolve(null);
                const key = `/browser-${++sequence}/${file.name}`;
                files.set(key, file);
                resolve(key);
            };
            input.onchange = () => finish(input.files[0]);
            input.oncancel = () => finish(null);
            document.body.appendChild(input);
            input.click();
        }),
        readCsvFile: async key => {
            const file = files.get(key);
            if (!file) throw new Error('Please select the CSV again.');
            try { return await file.text(); } finally { files.delete(key); }
        },
        saveCsv: async content => {
            download(content, 'Verified_EOS_Report.csv');
            return true;
        },
        writeToClipboard: async text => {
            const id = ++sequence;
            const result = await new Promise(resolve => {
                pending.set(id, resolve);
                send('clipboard', { id, text: String(text) });
                setTimeout(() => {
                    if (pending.delete(id)) resolve({ ok: false });
                }, 5000);
            });
            if (!result.ok) {
                const dialog = document.createElement('dialog');
                dialog.style.cssText = 'width:min(650px,90vw);padding:20px';
                replaceEosMarkup(dialog, '<p>Automatic copy was unavailable. Select this text and press Ctrl+C.</p><textarea style="width:100%;height:280px"></textarea><button>Close</button>');
                dialog.querySelector('textarea').value = text;
                dialog.querySelector('button').onclick = () => dialog.remove();
                document.body.appendChild(dialog);
                dialog.showModal();
                dialog.querySelector('textarea').select();
            }
        },
        getAppVersion: async () => boot.version + ' Browser Test',
        getDisplayMetrics: async () => ({ workAreaSize: { width: screen.availWidth, height: screen.availHeight }, scaleFactor: devicePixelRatio }),
        onDisplayMetricsChanged: callback => {
            const listener = async () => callback(await window.api.getDisplayMetrics());
            window.addEventListener('resize', listener);
            return () => window.removeEventListener('resize', listener);
        }
    };
    window.addEventListener('unhandledrejection', event => warning(`Browser test error: ${event.reason?.message || event.reason}`));
    window.addEventListener('error', event => {
        if (event.message) warning(`Browser test error: ${event.message}`);
    });
    window.addEventListener('DOMContentLoaded', () => {
        const apiButton = document.getElementById('fc-api-submit-btn');
        if (apiButton) {
            apiButton.disabled = true;
            apiButton.textContent = 'Unavailable in browser test';
        }
        const introduction = document.querySelector('#fc-api-modal .modal-intro');
        if (introduction) introduction.textContent = 'This test supports CSV-based EOS. The desktop FC API connection is not included.';
        const footer = document.querySelector('footer');
        if (footer) footer.textContent = 'Browser test | CSV workflow | Memory is separate from the desktop app';
        send('ready');
    });
})();

// database.js - The Memory System

const DB_KEY = 'gyr2_trailer_memory';
const OCULUS_DB_KEY = 'gyr2_oculus_memory';
const MEMORY_LIMIT_HOURS = 96;

function loadDatabase() {
    const raw = window.eosStorage.getItem(DB_KEY);
    return raw ? JSON.parse(raw) : {};
}

function saveDatabase(db) {
    window.eosStorage.setItem(DB_KEY, JSON.stringify(db));
}

function loadOculusMemory() {
    const raw = window.eosStorage.getItem(OCULUS_DB_KEY);
    return raw ? JSON.parse(raw) : { byIsa: {}, uploadedAt: null, counts: { vendor: 0, transship: 0 } };
}

function saveOculusMemory(records, counts) {
    const db = {
        byIsa: records || {},
        uploadedAt: Date.now(),
        counts: counts || { vendor: 0, transship: 0 }
    };

    window.eosStorage.setItem(OCULUS_DB_KEY, JSON.stringify(db));
    return db;
}

function clearOculusMemory() {
    window.eosStorage.removeItem(OCULUS_DB_KEY);
}

function recallOculusTrailer(isa) {
    const db = loadOculusMemory();
    const record = db.byIsa?.[isa];
    if (!record) return null;

    const now = Date.now();
    const limitMS = MEMORY_LIMIT_HOURS * 60 * 60 * 1000;
    if (db.uploadedAt && now - db.uploadedAt > limitMS) {
        window.eosStorage.removeItem(OCULUS_DB_KEY);
        console.log("Oculus memory expired and was cleared.");
        return null;
    }

    return record;
}

function purgeOldRecords() {
    const db = loadDatabase();
    const now = Date.now();
    const limitMS = MEMORY_LIMIT_HOURS * 60 * 60 * 1000;
    let deletedCount = 0;

    Object.keys(db).forEach(isa => {
        if (now - db[isa].timestamp > limitMS) {
            delete db[isa];
            deletedCount++;
        }
    });

    saveDatabase(db);
    if (deletedCount > 0) console.log(`Cleaned up ${deletedCount} old records from memory.`);
}

function rememberTrailer(isa, vrid, category, units, notes) {
    const db = loadDatabase();
    db[isa] = {
        vrid,
        category,
        units: parseInt(units, 10) || 0,
        notes,
        timestamp: Date.now(),
    };
    saveDatabase(db);
}

function recallTrailer(isa, currentVrid) {
    const db = loadDatabase();
    const record = db[isa];

    if (!record) return null;

    if (record.vrid !== currentVrid) {
        console.log(`Memory mismatch for ${isa}: old VRID ${record.vrid} vs new ${currentVrid}`);
        return null;
    }

    return record;
}

purgeOldRecords();

﻿// =========================================================================
// 1. Dependencies & Global State
// =========================================================================
let ymsFilePath = null;
let dockdashFilePath = null;
let ymsData = []; 
let dockdashData = []; 

// =========================================================================
// 0. Monitor-Aware UI Scaling
// =========================================================================
const BASE_DISPLAY_SIZE = { width: 1440, height: 900 };

let currentDisplayMetrics = null;

function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function applyResponsiveScale(metrics = currentDisplayMetrics) {
    const root = document.documentElement;
    const displaySize = metrics?.workAreaSize || {
        width: window.innerWidth,
        height: window.innerHeight,
    };

    const displayScale = Math.min(
        displaySize.width / BASE_DISPLAY_SIZE.width,
        displaySize.height / BASE_DISPLAY_SIZE.height
    );
    const viewportScale = Math.min(window.innerWidth / 1280, window.innerHeight / 760);
    const appScale = clampNumber(Math.min(displayScale, viewportScale), 0.82, 1.16);
    const layoutWidth = clampNumber(Math.round(displaySize.width * 0.94), 1040, 1720);

    root.style.setProperty('--app-scale', appScale.toFixed(3));
    root.style.setProperty('--app-max-width', `${layoutWidth}px`);
    root.classList.toggle('compact-display', appScale < 0.92);
    root.classList.toggle('wide-display', appScale > 1.06);
}

function setupMonitorAwareScaling() {
    applyResponsiveScale();
    window.addEventListener('resize', () => applyResponsiveScale());

    if (!window.api?.getDisplayMetrics) return;

    window.api.getDisplayMetrics()
        .then(metrics => {
            currentDisplayMetrics = metrics;
            applyResponsiveScale(metrics);
        })
        .catch(() => applyResponsiveScale());

    if (window.api.onDisplayMetricsChanged) {
        window.api.onDisplayMetricsChanged(metrics => {
            currentDisplayMetrics = metrics;
            applyResponsiveScale(metrics);
        });
    }
}

function isMemoryBypassEnabled() { return false; }

// --- NEW: HUB DATA STORAGE ---
let hubData = {
    vendorDock: {},
    vendorYard: {},
    transshipDock: {},
    transshipYard: {}
};
let pendingOculusUploads = {
    vendor: null,
    transship: null
};
let gapFillerData = { byIsa: {}, byVrid: {} }; 
let lastProcessedStats = {}; 
let fcApiTrailerLookup = {};

const FC_API_ENDPOINT_KEY = 'gyr2_fc_ids_api_endpoint';
const FC_API_WAREHOUSE_KEY = 'gyr2_fc_ids_warehouse_id';
const FC_API_AUTH_SESSION_KEY = 'gyr2_fc_ids_auth_token';

// Helper to normalize strings
function normalize(val) { 
    let str = String(val || "").trim().toUpperCase();
    if (str.startsWith('"') && str.endsWith('"')) str = str.slice(1, -1).trim();
    if (str.includes("E+") && !isNaN(parseFloat(str))) {
        let num = parseFloat(str);
        if (num > 1e10) return String(Math.round(num)); 
    }
    return str;
}

function parseHours(str) { return parseFloat(String(str || "").toLowerCase().replace("hrs", "").trim()) || 0; }

function getField(record, keyName) {
    if (!record) return undefined;
    const normalizedKey = keyName.toUpperCase().trim();
    const actualKey = Object.keys(record).find(k => k.trim().toUpperCase() === normalizedKey);
    return actualKey ? record[actualKey] : undefined;
}

function escapeHtmlAttr(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const PARCEL_CARRIERS = ['UPSS', 'UPSN', 'FDEG', 'FED EX', 'FEDEX', 'DHLC'];

function isParcelCarrier(carrier) {
    const normalizedCarrier = normalize(carrier).replace(/\s+/g, ' ');
    const compactCarrier = normalizedCarrier.replace(/\s+/g, '');

    return PARCEL_CARRIERS.some(code => {
        const normalizedCode = normalize(code).replace(/\s+/g, ' ');
        const compactCode = normalizedCode.replace(/\s+/g, '');

        return normalizedCarrier.includes(normalizedCode) || compactCarrier.includes(compactCode);
    });
}

function isLiveDropCarrier(carrier) {
    const normalizedCarrier = normalize(carrier);
    const compactCarrier = normalizedCarrier.replace(/\s+/g, '');

    return normalizedCarrier === "ATSB" || compactCarrier.includes("ATSB");
}

function isClampLoadNote(notes) {
    return normalize(notes).includes("CLAMP");
}

function isDoorLocation(location) {
    return normalize(location).startsWith("DD");
}

function isYardLocation(location) {
    return normalize(location).startsWith("PS");
}

function categoryAllowsLocation(category, location) {
    if (['dropPallets', 'dropFloor', 'parcelsYard', 'transshipYard', 'azngOver72'].includes(category)) {
        return isYardLocation(location);
    }

    if (['parcelsDock', 'livesHanded'].includes(category)) {
        return isDoorLocation(location);
    }

    return true;
}

const DISRUPTION_NOTE_TERMS = [
    "DAMAGED",
    "DAMAGE",
    "RED TAG",
    "RED TAGGED",
    "REDTAG",
    "BAD TRAILER",
    "BAD ORDER",
    "UNUSABLE",
    "DO NOT USE",
    "DONT USE",
    "OUT OF SERVICE",
    "OOS",
    "BROKEN",
    "NOT USABLE",
    "CAN'T USE",
    "CANNOT USE",
    "CAN NOT USE",
    "UNSAFE",
    "UNSAFE TO UNLOAD",
    "UNSAFE TO LOAD",
    "DO NOT LOAD",
    "DONT LOAD",
    "DO NOT UNLOAD",
    "DONT UNLOAD",
    "CANNOT UNLOAD",
    "CAN NOT UNLOAD",
    "CAN'T UNLOAD",
    "CANNOT LOAD",
    "CAN NOT LOAD",
    "CAN'T LOAD",
    "NEEDS REPAIR",
    "NEED REPAIR",
    "REPAIR NEEDED",
    "TRAILER REPAIR",
    "MECHANICAL ISSUE",
    "MECHANICAL",
    "FLAT TIRE",
    "TIRE ISSUE",
    "NO BRAKES",
    "BRAKE ISSUE",
    "AIR LEAK",
    "LEAKING",
    "HOLE IN",
    "DOOR BROKEN",
    "DOOR ISSUE"
];

const DISRUPTION_NOTE_PATTERNS = [
    /\bCASE\s*(#|:)?\s*\d{6,}\b/,
    /\bUNSAFE\b.*\b(LOAD|UNLOAD|USE|TRAILER)\b/,
    /\b(DO NOT|DONT|DON'T|CANNOT|CAN NOT|CAN'T)\b.*\b(LOAD|UNLOAD|USE)\b/,
    /\b(LOAD|UNLOAD|USE)\b.*\b(UNSAFE|DAMAGED|BROKEN)\b/,
    /\b(NEED|NEEDS|REQUIRES?)\b.*\b(REPAIR|FIX|MAINTENANCE)\b/,
    /\b(RED|ORANGE)\b.*\bTAG(GED)?\b/,
    /\bOUT\b.*\bSERVICE\b/
];

const PROBLEM_SOLVE_NOTE_PATTERNS = [
    /\bPROBLEM\s*SOLVE\b/,
    /\bPROBLEM\s*SOLV(E|ING)\b/,
    /\bPS\s*TRAILER\b/
];

const FREIGHT_DISRUPTION_PATTERNS = [
    /\bREJECT(?:ED|ING|ION|IONS|S)?\b/,
    /\bMISS?\s*SHIP(?:S|PED|PING|MENT|MENTS)?\b/,
    /\b(?:NO|WITHOUT|MISSING|AWAITING|PENDING)\s+(?:(?:A|THE|AVAILABLE|VALID)\s+)?MANI(?:FEST(?:S|ED)?)?\b/,
    /\bMANI(?:FEST)?\s+(?:(?:IS|WAS|STILL)\s+)?(?:MISSING|UNAVAILABLE|PENDING|NOT\s+(?:FOUND|AVAILABLE|RECEIVED|ATTACHED|PROVIDED))\b/,
    /\b(?:UNMANIFESTED|NOT\s+MANIFESTED)\b/
];

function hasFreightDisruptionNote(notes) {
    const text = normalize(notes).replace(/[-_\u2010-\u2015]+/g, ' ').replace(/\s+/g, ' ');
    return FREIGHT_DISRUPTION_PATTERNS.some(pattern => {
        for (const match of text.matchAll(new RegExp(pattern.source, 'g'))) {
            // A clerk explicitly saying "not rejected" or "no misships" is not a disruption.
            const before = text.slice(0, match.index);
            if (!/\b(?:(?:NOT|NEVER|NO|WITHOUT)\s+(?:BEEN\s+)?|NO\s+LONGER\s+)$/.test(before)) return true;
        }
        return false;
    });
}

function isParcelCategory(category) {
    return category === 'parcelsDock' || category === 'parcelsYard';
}

function isProblemSolveNote(normalizedNotes) {
    return PROBLEM_SOLVE_NOTE_PATTERNS.some(pattern => pattern.test(normalizedNotes));
}

function isDisruptionNote(notes, category = "") {
    const normalizedNotes = normalize(notes);
    const hasDisruptionSignal = DISRUPTION_NOTE_TERMS.some(term => normalizedNotes.includes(term)) ||
        DISRUPTION_NOTE_PATTERNS.some(pattern => pattern.test(normalizedNotes));

    if (hasDisruptionSignal || hasFreightDisruptionNote(notes)) return true;

    return isProblemSolveNote(normalizedNotes) && !isParcelCategory(category);
}

function createDisruptionBuckets() {
    return {
        dropPallets: [],
        dropFloor: [],
        parcelsDock: [],
        parcelsYard: [],
        transshipYard: [],
        azngOver72: [],
        livesHanded: []
    };
}

function getDisruptionCount(stats, category) {
    return stats.disruptions?.[category]?.length || 0;
}

function formatCountWithDisruptions(count, disruptions) {
    return disruptions > 0 ? `${count} + ${disruptions} DISRUPTIONS` : count;
}

function formatMetricWithDisruptions(stats, category) {
    return formatCountWithDisruptions(stats[category].length, getDisruptionCount(stats, category));
}

function addCategorizedRecord(stats, category, record) {
    if (!Array.isArray(stats[category])) return;

    if (isDisruptionNote(record.notes, category)) {
        stats.disruptions[category].push(record);
    } else {
        stats[category].push(record);
    }
}

function formatLivesValue(stats) {
    const liveDropCount = stats.liveDrops ? stats.liveDrops.length : 0;
    const trueLiveCount = Math.max(stats.livesHanded.length - liveDropCount, 0);
    const liveValue = liveDropCount > 0 ?
        `${trueLiveCount} (${liveDropCount} live/drops)` :
        String(stats.livesHanded.length);

    return formatCountWithDisruptions(liveValue, getDisruptionCount(stats, 'livesHanded'));
}

function inferYmsOnlyCategory(ymsInfo) {
    const notes = normalize(ymsInfo.notes);

    if (notes.includes("IBTRANS")) {
        if (isYardLocation(ymsInfo.location)) {
            return { category: 'transshipYard', confidence: 'MEDIUM', reason: 'IBTRANS in notes, PS location' };
        }

        if (isDoorLocation(ymsInfo.location)) {
            return { category: null, confidence: 'IGNORE', reason: 'IBTRANS already on DD; units unknown' };
        }
    }

    if (notes.includes("PARCEL")) {
        if (isDoorLocation(ymsInfo.location)) {
            return { category: 'parcelsDock', confidence: 'MEDIUM', reason: 'PARCEL in notes, DD location' };
        }

        if (isYardLocation(ymsInfo.location)) {
            return { category: 'parcelsYard', confidence: 'MEDIUM', reason: 'PARCEL in notes, PS location' };
        }
    }

    return null;
}

function resolveOculusCategory(oculusRecord, ymsInfo) {
    const loc = normalize(ymsInfo.location);
    const sourceType = normalize(oculusRecord.sourceType);
    const isParcel = isParcelCarrier(ymsInfo.carrier);
    const isLive = normalize(ymsInfo.loadType) === "LIVE";

    if (sourceType === "TRANSSHIP") {
        if (isYardLocation(loc)) return 'transshipYard';
        if (isDoorLocation(loc)) return 'volumeDoors';
        return null;
    }

    if (isParcel) {
        if (isDoorLocation(loc)) return 'parcelsDock';
        if (isYardLocation(loc)) return 'parcelsYard';
        return null;
    }

    if (isLive && isDoorLocation(loc)) return 'livesHanded';
    if (isDoorLocation(loc)) return 'volumeDoors';
    if (isYardLocation(loc)) return (oculusRecord.pallets > 0 || isClampLoadNote(ymsInfo.notes)) ? 'dropPallets' : 'dropFloor';

    return null;
}

function normalizeFcApiTrailer(record) {
    const isa = normalize(record?.isa || record?.ISA);
    if (!isa) return null;

    return {
        isa,
        warehouseId: normalize(record.warehouseId),
        location: normalize(record.locationCode || record.location || record.LOCATION),
        updatedAt: record.updatedAt || "",
        priorityLastUpdatedAt: record.priorityLastUpdatedAt || "",
        appointmentType: normalize(record.appointmentType || record["APPOINTMENT TYPE"]),
        carrierLoadType: normalize(record.carrierLoadType || record["CARRIER LOAD TYPE"]),
        dockArrivalTime: record.dockArrivalTime || "",
        priorityScore: Number(record.priorityScore || 0),
        pallets: Number(record.pallets || 0),
        cartons: Number(record.cartons || 0),
        units: Number(record.units || 0),
        empty: Boolean(record.empty),
        raw: record
    };
}

function resolveFcApiCategory(apiTrailer) {
    if (!apiTrailer) return null;

    const loc = normalize(apiTrailer.location);
    const appt = normalize(apiTrailer.appointmentType);
    const loadType = normalize(apiTrailer.carrierLoadType);

    if (appt === "TRANSSHIP") {
        if (isYardLocation(loc)) return 'transshipYard';
        if (isDoorLocation(loc)) return 'volOnlyDoors';
    }

    if (appt === "SMALL_PARCEL") {
        if (isDoorLocation(loc)) return 'parcelsDock';
        if (isYardLocation(loc)) return 'parcelsYard';
    }

    if (loadType === "LIVE" && isDoorLocation(loc)) return 'livesHanded';
    if (isDoorLocation(loc)) return 'volOnlyDoors';
    if (isYardLocation(loc)) return apiTrailer.pallets > 0 ? 'dropPallets' : 'dropFloor';

    return null;
}

function parseSpdDate(value) {
    const raw = String(value || "").trim().replace(/^"|"$/g, '');
    if (!raw || raw.toLowerCase() === 'undefined') return null;

    const match = raw.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    let year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;

    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);
    const date = new Date(year, month - 1, day, hour, minute);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatSpdDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${month}/${day}/${year} ${hour}:${minute}`;
}

function findOldestSpdRecord(records, ymsLookup) {
    return records
        .map(record => {
            const isa = normalize(getField(record, "ISA"));
            const ymsInfo = ymsLookup[isa];
            const dockLocation = normalize(getField(record, "LOCATION"));
            const spdDate = parseSpdDate(getField(record, "SPD"));

            return { isa, dockLocation, ymsInfo, spdDate };
        })
        .filter(candidate =>
            candidate.isa &&
            candidate.ymsInfo &&
            candidate.spdDate &&
            !isDoorLocation(candidate.dockLocation) &&
            !isDoorLocation(candidate.ymsInfo.location)
        )
        .sort((a, b) => a.spdDate - b.spdDate)[0] || null;
}

function findOldestTrailerInYard(records, ymsLookup) {
    return records
        .map(record => {
            const isa = normalize(getField(record, "ISA"));
            const ymsInfo = ymsLookup[isa];
            const dockLocation = normalize(getField(record, "LOCATION"));
            const dwellHours = parseHours(getField(record, "YARD DWELL"));

            return { isa, dockLocation, ymsInfo, dwellHours };
        })
        .filter(candidate =>
            candidate.isa &&
            candidate.ymsInfo &&
            candidate.dwellHours > 0 &&
            !isDoorLocation(candidate.dockLocation) &&
            !isDoorLocation(candidate.ymsInfo.location)
        )
        .sort((a, b) => b.dwellHours - a.dwellHours)[0] || null;
}

// =========================================================================
// 2. Clipboard Logic
// =========================================================================
function copyStatsToClipboard(stats) {
    if (!stats || !stats.dropPallets) return;
    
    const totalParcels = stats.parcelsDock.length + stats.parcelsYard.length;
    const parcelDisruptions = getDisruptionCount(stats, 'parcelsDock') + getDisruptionCount(stats, 'parcelsYard');
    const livesClipboardValue = formatLivesValue(stats);
    
    const oldestSpdIsa = stats.oldestSpd ? stats.oldestSpd.isa : "";
    const oldestSpdDate = stats.oldestSpd ? stats.oldestSpd.date : "";
    const oldestTrailerIsa = stats.oldestTrailer ? stats.oldestTrailer.isa : "";
    const formatVolume = value => Math.round(value || 0).toLocaleString();

    const clipboardString = [
        oldestSpdIsa,                   // Oldest SPD ISA
        oldestSpdDate,                  // Oldest SPD Date
        oldestTrailerIsa,               // Oldest Trailer In Yard ISA
        "",
        formatMetricWithDisruptions(stats, 'dropPallets'), // 1. Drop PL
        formatMetricWithDisruptions(stats, 'dropFloor'),   // 2. Drop FL
        formatMetricWithDisruptions(stats, 'parcelsDock'), // 3. Parcels Dock
        formatMetricWithDisruptions(stats, 'parcelsYard'), // 4. Parcels Yard
        formatCountWithDisruptions(totalParcels, parcelDisruptions), // 5. Total Parcels
        formatMetricWithDisruptions(stats, 'transshipYard'), // 6. Transship Yard
        formatMetricWithDisruptions(stats, 'azngOver72'),    // 7. AZNG > 72h
        "",                             // 8. Space
        livesClipboardValue,            // 9. Lives Handed
        "",                             // 10. Space
        "",                             // 11. Space
        formatVolume(stats.volumeDoors), // 12. Volume Doors
        formatVolume(stats.volumeYard)   // 13. Volume Yard
    ].join('\n');

    window.api.writeToClipboard(clipboardString);
}

// =========================================================================
// 3. UI Update Functions 
// =========================================================================
function updateMetricsUI(stats) {
    const updateTile = (id, value, isCritical = false) => {
        const element = document.getElementById(id);
        if (element) {
            const valueElement = element.querySelector('.value'); 
            if (valueElement) {
                const formattedValue = value.toLocaleString();
                valueElement.textContent = formattedValue;
                valueElement.title = formattedValue;
                valueElement.classList.toggle('long-value', formattedValue.length >= 6);
                valueElement.classList.toggle('extra-long-value', formattedValue.length >= 8);
            }
            const numericValue = typeof value === 'number' ?
                value :
                (String(value).match(/\d+/g) || []).reduce((sum, part) => sum + Number(part), 0);
            if (isCritical && numericValue > 0) element.classList.add('critical-active');
            else element.classList.remove('critical-active');
        }
    };

    const totalParcels = stats.parcelsDock.length + stats.parcelsYard.length;
    const parcelDisruptions = getDisruptionCount(stats, 'parcelsDock') + getDisruptionCount(stats, 'parcelsYard');

    updateTile('dropPallets', formatMetricWithDisruptions(stats, 'dropPallets'));
    updateTile('dropFloor', formatMetricWithDisruptions(stats, 'dropFloor'));
    updateTile('totalParcels', formatCountWithDisruptions(totalParcels, parcelDisruptions));
    updateTile('parcelsDock', formatMetricWithDisruptions(stats, 'parcelsDock'));
    updateTile('parcelsYard', formatMetricWithDisruptions(stats, 'parcelsYard'));
    updateTile('transshipYard', formatMetricWithDisruptions(stats, 'transshipYard'));
    updateTile('livesHanded', formatLivesValue(stats));
    updateTile('azngOver72', formatMetricWithDisruptions(stats, 'azngOver72'), true);
    updateTile('researchQueue', stats.researchQueue, true); 
    
    updateTile('volumeDoors', Math.round(stats.volumeDoors));
    updateTile('volumeYard', Math.round(stats.volumeYard));
}

function updateActionPanel(status) {
    const panel = document.getElementById('action-panel');
    const message = document.getElementById('action-message');
    const icon = document.getElementById('action-icon');
    panel.classList.remove('status-neutral', 'status-critical', 'status-success');

    if (status.reconciled) {
        const isCritical = status.azngOver72 > 0 || status.researchQueue > 0;
        panel.classList.add(isCritical ? 'status-critical' : 'status-success');
        icon.className = isCritical ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
        message.textContent = isCritical ?
            `CRITICAL: ${status.researchQueue} items need research.` :
            'SUCCESS: Metrics generated.';
    } else {
        panel.classList.add('status-neutral');
        icon.className = 'fas fa-info-circle';
        message.textContent = status.message || "Ready.";
    }
}

function updateCardStatus(type, text, success) {
    const card = document.getElementById(`${type}-card`);
    const status = document.getElementById(`${type}-status`);
    const icon = card ? card.querySelector('.main-icon') : null;

    if (!card) return;

    card.classList.remove('success', 'error');
    
    if (success === true) {
        card.classList.add('success');
        if(icon) icon.className = 'fas fa-check-circle main-icon fa-5x';
    } else if (success === false) {
        card.classList.add('error');
        if(icon) icon.className = 'fas fa-times-circle main-icon fa-5x';
    } else {
        // Reset to default icons
        if(icon) {
            if (type === 'yms') icon.className = 'fas fa-database main-icon fa-5x';
            else if (type === 'dockdash') icon.className = 'fas fa-file-csv main-icon fa-5x';
            else if (type === 'gap-filler') icon.className = 'fas fa-network-wired main-icon fa-5x'; // Updated Icon
        }
    }
    if (status) status.textContent = text;
}

function updateFcApiStatus(message, state = null) {
    const status = document.getElementById('fc-api-status');
    const card = document.querySelector('.api-test-card');
    if (status) status.textContent = message;
    if (card) {
        card.classList.remove('success', 'error');
        if (state) card.classList.add(state);
    }
}

function getFcApiConfig() {
    const savedEndpoint = window.eosStorage.getItem(FC_API_ENDPOINT_KEY) || '';
    const savedWarehouse = window.eosStorage.getItem(FC_API_WAREHOUSE_KEY) || 'GYR2';
    const savedAuthToken = sessionStorage.getItem(FC_API_AUTH_SESSION_KEY) || '';

    return new Promise(resolve => {
        const modal = document.getElementById('fc-api-modal');
        const endpointInput = document.getElementById('fc-api-endpoint-input');
        const warehouseInput = document.getElementById('fc-api-warehouse-input');
        const tokenInput = document.getElementById('fc-api-token-input');
        const submitBtn = document.getElementById('fc-api-submit-btn');
        const cancelBtn = document.getElementById('fc-api-cancel-btn');

        if (!modal || !endpointInput || !warehouseInput || !tokenInput || !submitBtn || !cancelBtn) {
            resolve(null);
            return;
        }

        endpointInput.value = savedEndpoint;
        warehouseInput.value = savedWarehouse;
        tokenInput.value = savedAuthToken;
        modal.style.display = 'block';
        endpointInput.focus();

        const cleanup = () => {
            modal.style.display = 'none';
            submitBtn.removeEventListener('click', handleSubmit);
            cancelBtn.removeEventListener('click', handleCancel);
            modal.removeEventListener('click', handleBackdrop);
            document.removeEventListener('keydown', handleKeydown);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        const handleSubmit = () => {
            const endpoint = endpointInput.value.trim();
            const warehouseId = warehouseInput.value.trim().toUpperCase();
            const authToken = tokenInput.value.trim();

            if (!endpoint || !warehouseId) {
                updateFcApiStatus('Endpoint and warehouse are required.', 'error');
                return;
            }

            window.eosStorage.setItem(FC_API_ENDPOINT_KEY, endpoint);
            window.eosStorage.setItem(FC_API_WAREHOUSE_KEY, warehouseId);
            sessionStorage.setItem(FC_API_AUTH_SESSION_KEY, authToken);

            cleanup();
            resolve({ endpoint, warehouseId, authToken });
        };

        const handleBackdrop = event => {
            if (event.target === modal) handleCancel();
        };

        const handleKeydown = event => {
            if (event.key === 'Escape') handleCancel();
            if (event.key === 'Enter' && document.activeElement !== tokenInput) handleSubmit();
        };

        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        modal.addEventListener('click', handleBackdrop);
        document.addEventListener('keydown', handleKeydown);
    });
}

async function testFcApiForResearchQueue() {
    if (!window.api?.getTrailersByFC) {
        alert('FC API bridge is not available.');
        return;
    }

    const config = await getFcApiConfig();
    if (!config) return;

    updateFcApiStatus('Calling FCInboundDockService...', null);

    try {
        const result = await window.api.getTrailersByFC(config);
        const trailers = (result.trailers || [])
            .map(normalizeFcApiTrailer)
            .filter(Boolean);

        fcApiTrailerLookup = trailers.reduce((lookup, trailer) => {
            lookup[trailer.isa] = trailer;
            return lookup;
        }, {});

        const researchRecords = lastProcessedStats.researchQueueRecords || [];
        let matched = 0;
        let enriched = 0;

        researchRecords.forEach(record => {
            const apiTrailer = fcApiTrailerLookup[normalize(record.isa)];
            if (!apiTrailer) return;

            matched += 1;
            const suggestedCategory = resolveFcApiCategory(apiTrailer);
            if (suggestedCategory) {
                record.suggestedCategory = suggestedCategory;
                record.confidence = 'API';
            }
            if (apiTrailer.units > 0) record.suggestedUnits = apiTrailer.units;
            if (apiTrailer.location) record.location = apiTrailer.location;
            record.apiMatch = {
                units: apiTrailer.units,
                cartons: apiTrailer.cartons,
                pallets: apiTrailer.pallets,
                appointmentType: apiTrailer.appointmentType,
                carrierLoadType: apiTrailer.carrierLoadType,
                priorityScore: apiTrailer.priorityScore,
                updatedAt: apiTrailer.updatedAt
            };
            record.notes = `FC-IDS ${apiTrailer.appointmentType || 'UNKNOWN'} ${apiTrailer.carrierLoadType || ''} ${record.notes || ''}`.trim();
            enriched += 1;
        });

        updateFcApiStatus(`API OK: ${trailers.length} trailers returned, ${matched} Research Queue matches.`, 'success');

        if (researchRecords.length) {
            lastProcessedStats.researchQueue = researchRecords.length;
            showDetailModal('researchQueue');
        }

        if (!enriched) {
            alert(`API worked and returned ${trailers.length} trailers, but none matched the current Research Queue.`);
        }
    } catch (error) {
        console.error('FC API test failed:', error);
        updateFcApiStatus(`API failed: ${error.message}`, 'error');
        alert(`FC API test failed:\n${error.message}`);
    }
}

// =========================================================================
// 4. Modal & Research Logic
// =========================================================================

function parseOculusNumber(value) {
    return parseFloat(String(value || "0").replace(/,/g, "")) || 0;
}

function cleanOculusText(value) {
    return String(value || "").trim();
}

function getFlexibleField(record, candidates) {
    const keys = Object.keys(record || {});
    for (const candidate of candidates) {
        const normalizedCandidate = normalize(candidate);
        const exactKey = keys.find(key => normalize(key) === normalizedCandidate);
        if (exactKey) return record[exactKey];
    }

    for (const candidate of candidates) {
        const normalizedCandidate = normalize(candidate);
        const fuzzyKey = keys.find(key => normalize(key).includes(normalizedCandidate));
        if (fuzzyKey) return record[fuzzyKey];
    }

    return "";
}

function extractOculusIsa(record) {
    const directIsa = getFlexibleField(record, [
        "ISA",
        "ISA ID",
        "INBOUND SHIPMENT APPOINTMENT",
        "INBOUND SHIPMENT APPOINTMENT ID",
        "APPOINTMENT ID",
        "LOAD ID",
        "LOAD IDENTIFIER"
    ]);
    const directMatch = String(directIsa || "").match(/\b(2\d{11})\b/);
    if (directMatch) return normalize(directMatch[1]);

    const joinedValues = Object.values(record || {}).join(" ");
    const fallbackMatch = joinedValues.match(/\b(2\d{11})\b/);
    return fallbackMatch ? normalize(fallbackMatch[1]) : "";
}

function extractOculusVrid(record) {
    return normalize(getFlexibleField(record, [
        "VRID",
        "TRAILER VRID",
        "TRIP ID",
        "TOUR ID"
    ]));
}

function parseOculusCsvRows(rows, sourceType) {
    const records = {};
    let count = 0;

    rows.forEach(row => {
        const isa = extractOculusIsa(row);
        if (!isa) return;

        const cartons = parseOculusNumber(getFlexibleField(row, [
            "CARTONS/TOTES",
            "CARTONS / TOTES",
            "CARTON/TOTE",
            "CARTON / TOTE",
            "CARTONS",
            "CARTON COUNT",
            "CARTON QTY",
            "TOTES",
            "TOTE COUNT",
            "TOTE QTY",
            "CASES",
            "CASE COUNT"
        ]));
        const units = parseOculusNumber(getFlexibleField(row, ["UNITS", "UNIT COUNT", "UNIT QTY", "TOTAL UNITS", "PENDING UNITS", "EXPECTED UNITS", "EACHES", "EACH QTY", "QUANTITY", "QTY"]));
        const pallets = parseOculusNumber(getFlexibleField(row, ["PALLETS", "PALLET COUNT", "PALLET QTY", "NUMBER OF PALLETS"]));
        const cut = cleanOculusText(getFlexibleField(row, ["CRITICAL UNLOAD TIME", "CUT"]));
        const trailerNumber = cleanOculusText(getFlexibleField(row, ["TRAILER NUMBER", "TRAILER NUM", "TRAILER"]));
        const trailerLocation = cleanOculusText(getFlexibleField(row, ["TRAILER LOCATION", "LOCATION"]));
        const status = cleanOculusText(getFlexibleField(row, ["STATUS", "APPT. STATUS", "TRANSLOAD STATUS", "TRANSSHIP STATUS"]));
        const loadConfig = cleanOculusText(getFlexibleField(row, ["LOAD CONFIG", "FL TYPE"]));
        const scac = cleanOculusText(getFlexibleField(row, ["SCAC", "CARRIER"]));
        const apptType = cleanOculusText(getFlexibleField(row, ["APPT. TYPE", "APPOINTMENT TYPE"]));
        const liveVsDrop = cleanOculusText(getFlexibleField(row, ["LIVE VS DROP", "LOAD TYPE"]));

        records[isa] = {
            isa,
            vrid: extractOculusVrid(row),
            sourceType,
            cartons,
            units,
            pallets,
            cut,
            trailerNumber,
            trailerLocation,
            status,
            loadConfig,
            scac,
            apptType,
            liveVsDrop,
            isPalletized: pallets > 0,
            timestamp: Date.now()
        };
        count++;
    });

    return { records, count };
}

function updateOculusUploadStatus(type, text, success) {
    const status = document.getElementById(`oculus-${type}-status`);
    const card = document.getElementById(`oculus-${type}-card`);

    if (status) status.textContent = text;
    if (card) {
        card.classList.remove('success', 'error');
        if (success === true) card.classList.add('success');
        if (success === false) card.classList.add('error');
    }
}

function updateOculusSyncButton() {
    const button = document.getElementById('sync-oculus-memory-btn');
    const summary = document.getElementById('oculus-sync-summary');
    const vendorCount = pendingOculusUploads.vendor?.count || 0;
    const transshipCount = pendingOculusUploads.transship?.count || 0;

    if (button) button.disabled = !(vendorCount > 0 && transshipCount > 0);
    if (summary) {
        summary.textContent = vendorCount || transshipCount ?
            `Ready: ${vendorCount} vendor records and ${transshipCount} transship records selected.` :
            "No Oculus files selected.";
    }
}

function refreshOculusMemoryCard() {
    if (typeof loadOculusMemory !== 'function') {
        updateCardStatus('gap-filler', 'Sync Oculus memory', null);
        return;
    }

    const saved = loadOculusMemory();
    const total = Object.keys(saved.byIsa || {}).length;
    if (!total) {
        updateCardStatus('gap-filler', 'Sync Oculus memory', null);
        return;
    }

    const uploadedDate = saved.uploadedAt ? new Date(saved.uploadedAt).toLocaleDateString() : 'saved';
    updateCardStatus('gap-filler', `Oculus Memory: ${total} records (${uploadedDate})`, true);
}

async function handleOculusFileSelection(type) {
    const filePath = await window.api.openFile();
    if (!filePath) return;

    updateOculusUploadStatus(type, "Reading...", null);

    try {
        const rawData = await window.api.readCsvFile(filePath);
        const rows = parseCSV(rawData, []);
        const parsed = parseOculusCsvRows(rows, type);
        const fileName = filePath.split(/[/\\]/).pop();

        pendingOculusUploads[type] = parsed;
        updateOculusUploadStatus(type, `Loaded: ${fileName} (${parsed.count} ISA records)`, parsed.count > 0);
    } catch (error) {
        console.error(`Failed to read Oculus ${type} file:`, error);
        pendingOculusUploads[type] = null;
        updateOculusUploadStatus(type, "Failed to load file.", false);
    }

    updateOculusSyncButton();
    updateFileClearButtons();
}

window.processHubData = function() {
    const vendorUpload = pendingOculusUploads.vendor;
    const transshipUpload = pendingOculusUploads.transship;

    if (!vendorUpload?.count || !transshipUpload?.count) {
        alert("Please load both the Oculus Vendor CSV and Transship CSV before syncing.");
        return;
    }

    const records = {
        ...vendorUpload.records,
        ...transshipUpload.records
    };
    const total = Object.keys(records).length;

    if (typeof saveOculusMemory === 'function') {
        saveOculusMemory(records, {
            vendor: vendorUpload.count,
            transship: transshipUpload.count
        });
    }

    document.getElementById('research-hub-modal').style.display = 'none';
    refreshOculusMemoryCard();

    const reconcileBtn = document.getElementById('reconcile-btn');
    if (ymsFilePath && dockdashFilePath && reconcileBtn) reconcileBtn.disabled = false;
};

// --- MANUAL INTERACTION ---
window.editResearchItem = function(index) {
    const record = lastProcessedStats.researchQueueRecords[index];
    const newLoc = prompt("Enter new Location (leave blank to keep current):", record.location);
    if (newLoc) {
        lastProcessedStats.researchQueueRecords[index].location = newLoc;
        showDetailModal('researchQueue');
    }
};

window.moveResearchItem = function(index) {
    const record = lastProcessedStats.researchQueueRecords[index];
    const select = document.getElementById(`assign-select-${index}`);
    const unitsInput = document.getElementById(`assign-units-${index}`);
    
    const targetCategory = select.value;
    const manualUnits = parseFloat(unitsInput.value.replace(/,/g, '')) || 0;

    if (!targetCategory) { alert("Please select a category."); return; }

    // 1. SAVE TO MEMORY
    if (!isMemoryBypassEnabled() && typeof rememberTrailer === 'function') {
        rememberTrailer(record.isa, record.vrid, targetCategory, manualUnits, record.notes);
    }

    // 2. Update Stats
    const recordInfo = { 
        isa: record.isa, 
        vrid: record.vrid, 
        location: record.location, 
        dwell: record.dwell, 
        pallets: 'MANUAL',
        category: targetCategory,
        units: manualUnits,
        notes: record.notes || ''
    };

    if (Array.isArray(lastProcessedStats[targetCategory])) {
        addCategorizedRecord(lastProcessedStats, targetCategory, recordInfo);
    }

    switch(targetCategory) {
        case 'dropPallets':
        case 'dropFloor':
        case 'transshipYard':
        case 'parcelsYard': lastProcessedStats.volumeYard += manualUnits; break;
        case 'parcelsDock':
        case 'livesHanded': lastProcessedStats.volumeDoors += manualUnits; break;
        case 'volOnlyDoors': lastProcessedStats.volumeDoors += manualUnits; break;
        case 'volOnlyYard': lastProcessedStats.volumeYard += manualUnits; break;
    }

    // 3. Remove from Queue & Refresh UI
    lastProcessedStats.researchQueueRecords.splice(index, 1);
    lastProcessedStats.researchQueue = lastProcessedStats.researchQueueRecords.length;

    updateMetricsUI(lastProcessedStats);
    copyStatsToClipboard(lastProcessedStats);

    if (lastProcessedStats.researchQueue > 0) {
        showDetailModal('researchQueue'); 
    } else {
        document.getElementById('detail-modal').style.display = 'none';
        updateActionPanel({ 
            reconciled: true, 
            excluded: lastProcessedStats.excluded.length, 
            azngOver72: lastProcessedStats.azngOver72.length, 
            researchQueue: 0,
            message: "All research items resolved."
        });
    }
};

function showDetailModal(metricId) {
    if (!lastProcessedStats || Object.keys(lastProcessedStats).length === 0) {
        return;
    }

    let records = lastProcessedStats[metricId];
    let modalTitle = metricId.toUpperCase().replace(/([A-Z])/g, ' $1');
    const isResearchQueue = (metricId === 'researchQueue');
    const hasDisruptionDetails = Array.isArray(lastProcessedStats.disruptions?.[metricId]);
    
    if (isResearchQueue) records = lastProcessedStats.researchQueueRecords;
    if (metricId === 'excluded') records = lastProcessedStats.excluded;
    if (hasDisruptionDetails) {
        const usableRecords = (lastProcessedStats[metricId] || []).map(record => ({
            ...record,
            detailStatus: 'USABLE'
        }));
        const disruptions = (lastProcessedStats.disruptions[metricId] || []).map(record => ({
            ...record,
            detailStatus: 'DISRUPTION'
        }));

        records = [...usableRecords, ...disruptions];
    }

    if (!Array.isArray(records) || records.length === 0) { 
        return; 
    }

    const modal = document.getElementById('detail-modal'); 
    const tbody = document.getElementById('detail-table-body');
    const thead = modal.querySelector('thead tr');
    const title = document.getElementById('modal-title');
    
    title.textContent = `${modalTitle} (${records.length})`;
    thead.replaceChildren(); 
    
    let headers = isResearchQueue ? 
        ['ISA', 'VRID', 'LOC', 'NOTES', 'CATEGORY', 'UNITS', 'ACTION'] : 
        (metricId === 'excluded' ? ['ISA', 'VRID', 'LOCATION'] : ['ISA', 'VRID', 'LOCATION', 'DWELL', 'PALLETS']);

    if (hasDisruptionDetails) headers = ['ISA', 'VRID / TRAILER', 'LOCATION', 'DWELL', 'PALLETS', 'STATUS', 'NOTES'];

    headers.forEach(h => { const th = document.createElement('th'); th.textContent = h; thead.appendChild(th); });
    
    tbody.replaceChildren(); 
    records.forEach((record, index) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = record.isa || (record.countSource === 'yard-notes' ? 'No ISA (yard notes)' : 'N/A');
        row.insertCell().textContent = record.vrid || record.trailer || 'N/A';
        row.insertCell().textContent = record.location || 'N/A';
        
        if (isResearchQueue) {
            const notesCell = row.insertCell();
            notesCell.textContent = record.notes || ''; 
            notesCell.style.maxWidth = "200px"; notesCell.style.overflow = "hidden"; notesCell.style.textOverflow = "ellipsis"; notesCell.style.whiteSpace = "nowrap";

            // Auto-Select Logic
            const defaultCat = record.suggestedCategory || ""; 
            const defaultUnits = record.suggestedUnits ? String(record.suggestedUnits) : "";
            const cellAssign = row.insertCell();
            replaceEosMarkup(cellAssign, `
                <div class="research-assignment-controls">
                <button data-eos-edit="${index}" class="research-edit-btn">EDIT LOC</button>
                <select id="assign-select-${index}" class="research-select">
                    <option value="" disabled ${!defaultCat ? 'selected' : ''}>Select...</option>
                    <optgroup label="Volume Only">
                        <option value="volOnlyDoors" ${defaultCat === 'volOnlyDoors' ? 'selected' : ''}>Volume on Doors</option>
                        <option value="volOnlyYard" ${defaultCat === 'volOnlyYard' ? 'selected' : ''}>Volume in Yard</option>
                    </optgroup>
                    <optgroup label="Assign to Tile">
                        <option value="dropPallets" ${defaultCat === 'dropPallets' ? 'selected' : ''}>Drop Pallets</option>
                        <option value="dropFloor" ${defaultCat === 'dropFloor' ? 'selected' : ''}>Drop Floor</option>
                        <option value="transshipYard" ${defaultCat === 'transshipYard' ? 'selected' : ''}>Transship Yard</option>
                        <option value="parcelsDock" ${defaultCat === 'parcelsDock' ? 'selected' : ''}>Parcels on Dock</option>
                        <option value="parcelsYard" ${defaultCat === 'parcelsYard' ? 'selected' : ''}>Parcels in Yard</option>
                        <option value="livesHanded" ${defaultCat === 'livesHanded' ? 'selected' : ''}>Lives Handed Over</option>
                    </optgroup>
                </select>
                <input type="text" inputmode="decimal" id="assign-units-${index}" class="research-units-input" placeholder="Units" value="${escapeHtmlAttr(defaultUnits)}">
                <button data-eos-move="${index}" class="research-move-btn">MOVE</button>
                </div>`);
        } else if (hasDisruptionDetails) {
            row.insertCell().textContent = record.dwell || 'N/A';
            row.insertCell().textContent = record.pallets || '0';
            row.insertCell().textContent = record.detailStatus || 'USABLE';
            row.insertCell().textContent = record.notes || '';
        } else if (metricId !== 'excluded') {
            row.insertCell().textContent = record.dwell || 'N/A';
            row.insertCell().textContent = record.pallets || '0';
        }
    });
    modal.style.display = 'block';
}

// =========================================================================
// 5. File Handling & Parsing
// =========================================================================
function parseCSV(text, requiredHeaders = []) {
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const rows = [];
    let currentRow = [];
    let currentVal = "";
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') insideQuote = !insideQuote;
        else if (char === ',' && !insideQuote) { currentRow.push(currentVal.trim()); currentVal = ""; }
        else if (char === '\n' && !insideQuote) {
            currentRow.push(currentVal.trim());
            if (currentRow.length > 1 || currentRow[0] !== "") rows.push(currentRow);
            currentRow = []; currentVal = "";
        } else currentVal += char;
    }
    if (currentVal) currentRow.push(currentVal.trim());
    if (currentRow.length > 0) rows.push(currentRow);
    if (rows.length < 2) return [];

    if (requiredHeaders.length === 0) {
        // Broad parsing (for Gap Filler backup)
        const headers = rows[0].map(h => h.trim().toUpperCase());
        const data = [];
        for (let i = 1; i < rows.length; i++) {
            const record = {};
            if (rows[i].length >= headers.length) {
                headers.forEach((h, index) => { record[h] = rows[i][index]; });
                data.push(record);
            }
        }
        return data;
    }

    const headers = rows[0].map(h => h.trim().toUpperCase());
    const missing = requiredHeaders.filter(h => !headers.some(header => header.includes(h)));
    if (missing.length > 0) { alert(`Missing required headers: ${missing.join(", ")}`); return []; }

    const data = [];
    for (let i = 1; i < rows.length; i++) {
        const record = {};
        if (rows[i].length >= headers.length) {
            headers.forEach((h, index) => { record[h] = rows[i][index]; });
            data.push(record);
        }
    }
    return data;
}

async function handleFileSelection(type) {
    const filePath = await window.api.openFile();
    if (!filePath) return;
    
    updateCardStatus(type, "Reading...", null);
    const rawData = await window.api.readCsvFile(filePath);
    
    // YMS needs "LOAD IDENTIFIER(S)", DockDash needs "ISA"
    const headers = type === 'yms' ? ["LOAD IDENTIFIER(S)"] : ["ISA", "VRID"];
    const parsed = parseCSV(rawData, headers);
    
    if (parsed.length === 0) {
        updateCardStatus(type, "Failed to load or empty.", false);
        return;
    }
    
    if (type === 'yms') { ymsData = parsed; ymsFilePath = filePath; }
    else { dockdashData = parsed; dockdashFilePath = filePath; }
    
    const fileName = filePath.split(/[/\\]/).pop();
    updateCardStatus(type, `Loaded: ${fileName} (${parsed.length} rows)`, true);
    
    const reconcileBtn = document.getElementById('reconcile-btn');
    const dockdashBtn = document.getElementById('browse-dockdash-btn');
    
    if (type === 'yms' && dockdashBtn) dockdashBtn.disabled = false;
    if (ymsFilePath && dockdashFilePath && reconcileBtn) reconcileBtn.disabled = false;
    updateFileClearButtons();
}

function updateFileClearButtons() {
    const clearYmsBtn = document.getElementById('clear-yms-btn');
    const clearDockdashBtn = document.getElementById('clear-dockdash-btn');
    const clearVendorBtn = document.getElementById('clear-oculus-vendor-btn');
    const clearTransshipBtn = document.getElementById('clear-oculus-transship-btn');

    if (clearYmsBtn) clearYmsBtn.disabled = !ymsFilePath;
    if (clearDockdashBtn) clearDockdashBtn.disabled = !dockdashFilePath;
    if (clearVendorBtn) clearVendorBtn.disabled = !(pendingOculusUploads.vendor?.count > 0);
    if (clearTransshipBtn) clearTransshipBtn.disabled = !(pendingOculusUploads.transship?.count > 0);
}

function updateRequiredFileControls() {
    const reconcileBtn = document.getElementById('reconcile-btn');
    const exportBtn = document.getElementById('export-btn');
    const dockdashBtn = document.getElementById('browse-dockdash-btn');

    if (dockdashBtn) dockdashBtn.disabled = !ymsFilePath;
    if (reconcileBtn) reconcileBtn.disabled = !(ymsFilePath && dockdashFilePath);
    if (exportBtn && !(ymsFilePath && dockdashFilePath)) exportBtn.disabled = true;
    updateFileClearButtons();
}

function clearLoadedFile(type) {
    if (type === 'yms') {
        ymsFilePath = null;
        ymsData = [];
        dockdashFilePath = null;
        dockdashData = [];
        lastProcessedStats = {};
        updateCardStatus('yms', 'Select YMS File', null);
        updateCardStatus('dockdash', 'Select Dock Dash File', null);
    } else if (type === 'dockdash') {
        dockdashFilePath = null;
        dockdashData = [];
        lastProcessedStats = {};
        updateCardStatus('dockdash', 'Select Dock Dash File', null);
    }

    updateRequiredFileControls();
    updateActionPanel({ reconciled: false, message: 'Awaiting file selections...' });
}

function clearOculusUpload(type) {
    pendingOculusUploads[type] = null;
    updateOculusUploadStatus(type, type === 'vendor' ? 'Drops and AF lives/live-drops.' : 'Transship trailers and unit counts.', null);
    updateOculusSyncButton();
    updateFileClearButtons();
}

// Backup Gap Filler Selection
async function handleGapFillerSelection() {
    const filePath = await window.api.openFile();
    if (!filePath) return;

    updateCardStatus('gap-filler', "Reading...", null);
    const rawData = await window.api.readCsvFile(filePath);
    const rows = parseCSV(rawData, []); 
    
    gapFillerData = { byIsa: {}, byVrid: {} };
    let count = 0;

    rows.forEach(row => {
        const isa = normalize(getField(row, "ISA") || getField(row, "Container ID"));
        const vrid = normalize(getField(row, "Trailer VRID") || getField(row, "VRID"));
        const rawUnits = getField(row, "Total Units") || getField(row, "Pending Units") || "0";
        const units = parseFloat(rawUnits.replace(/,/g, '')) || 0;

        if (isa && isa.length > 4) {
            gapFillerData.byIsa[isa] = { units: units, vrid: vrid || "UNKNOWN" };
            count++;
        }
        if (vrid && vrid.length > 4) {
            gapFillerData.byVrid[vrid] = { units: units, isa: isa || "UNKNOWN" };
            if (!isa || isa.length <= 4) count++;
        }
    });

    updateCardStatus('gap-filler', `Loaded: ${count} Records`, true);
    console.log("Gap Filler Data Loaded:", gapFillerData);
}

// =========================================================================
// 6. Core Logic: Reconcile (UPGRADED)
// =========================================================================
function extractYmsIsa(record) {
    const fullLoadId = getField(record, "LOAD IDENTIFIER(S)");
    if (fullLoadId) {
        const match = fullLoadId.match(/ISA\W*(\d+)/i);
        if (match) return normalize(match[1]);
    }
    return null;
}

function getYmsCarrier(record) {
    return normalize(getField(record, 'CARRIER') || getField(record, 'OWNER (OPERATOR)') || getField(record, 'OWNER'));
}

function getYmsTrailerIdentity(record) {
    const vrid = normalize(getField(record, 'VRID') || String(getField(record, 'LOAD IDENTIFIER(S)') || '').match(/\bVRID\W*([A-Z0-9]+)/i)?.[1]);
    const trailer = normalize(getField(record, 'VEHICLE ID') || getField(record, 'TRAILER NUMBER') || getField(record, 'TRAILER ID'));
    const location = normalize(getField(record, 'LOCATION'));
    const carrier = getYmsCarrier(record).replace(/\s+/g, '');
    const keys = [];
    if (vrid) keys.push(`vrid:${vrid}`);
    if (trailer) keys.push(`trailer:${carrier}:${trailer}`);
    if (!keys.length) keys.push(`location:${carrier}:${location}`);
    return { vrid, trailer, keys };
}

function collectUnassignedYardParcels(rows) {
    const seen = new Set();
    // Rows with an attached ISA are handled by the existing reconciliation/research flow.
    rows.filter(row => extractYmsIsa(row)).forEach(row => {
        getYmsTrailerIdentity(row).keys.forEach(key => seen.add(key));
    });
    const parcels = [];
    rows.forEach(row => {
        if (extractYmsIsa(row)) return;
        const location = normalize(getField(row, 'LOCATION'));
        const notes = getField(row, 'NOTES') || '';
        const carrier = getYmsCarrier(row);
        const equipmentType = normalize(getField(row, 'TYPE'));
        if (!isYardLocation(location) || !isParcelCarrier(carrier) || !/\bISA\b/i.test(notes)) return;
        if (equipmentType && !/\bTRAILER\b/.test(equipmentType)) return;
        const identity = getYmsTrailerIdentity(row);
        const alreadySeen = identity.keys.some(key => seen.has(key));
        identity.keys.forEach(key => seen.add(key));
        if (alreadySeen) return;
        parcels.push({
            isa: '', vrid: identity.vrid, trailer: identity.trailer, location, carrier,
            dwell: getField(row, 'YARD DWELL') || getField(row, 'TIME IN YARD') || '',
            pallets: '', units: 0, notes, countSource: 'yard-notes'
        });
    });
    return parcels;
}

function calculateMetrics(data, excluded) {
    let stats = {
        dropPallets: [], dropFloor: [], parcelsDock: [], parcelsYard: [],
        transshipYard: [], azngOver72: [], livesHanded: [], liveDrops: [], researchQueue: 0,
        volumeDoors: 0, volumeYard: 0, excluded: excluded, disruptions: createDisruptionBuckets()
    };
    
    data.forEach(record => {
        const type = normalize(getField(record, "CARRIER LOAD TYPE"));
        const appt = normalize(getField(record, "APPOINTMENT TYPE"));
        const loc = normalize(getField(record, "LOCATION"));
        const carrier = normalize(getField(record, "CARRIER"));
        const units = parseFloat(String(getField(record, "UNITS") || "0").replace(/,/g, '')) || 0;
        const dwell = parseHours(getField(record, "YARD DWELL"));
        const isParcel = appt === "SMALL_PARCEL" || isParcelCarrier(carrier);
        
        const info = { 
            isa: getField(record, "ISA"), 
            vrid: getField(record, "VRID"), 
            location: loc, 
            dwell: getField(record, "YARD DWELL"), 
            pallets: getField(record, "PALLETS"),
            carrier,
            loadType: type,
            notes: [getField(record, "__YMS_NOTES"), getField(record, "NOTES")].filter(Boolean).join(' | ')
        };
        
        if (isDoorLocation(loc)) stats.volumeDoors += units;
        else if (isYardLocation(loc)) stats.volumeYard += units;

        if (type === "DROP" && appt === "CARP" && isYardLocation(loc)) {
            const dropCategory = (parseFloat(getField(record, "PALLETS")) > 0 || isClampLoadNote(info.notes)) ? 'dropPallets' : 'dropFloor';
            addCategorizedRecord(stats, dropCategory, info);
        }
        if (isParcel) {
            if (isDoorLocation(loc)) addCategorizedRecord(stats, 'parcelsDock', info);
            if (isYardLocation(loc)) addCategorizedRecord(stats, 'parcelsYard', info);
        }
        if (appt === "TRANSSHIP" && isYardLocation(loc)) addCategorizedRecord(stats, 'transshipYard', info);
        if (carrier.startsWith("AZNG") && dwell >= 72 && isYardLocation(loc)) addCategorizedRecord(stats, 'azngOver72', info);
        if (type === "LIVE" && isDoorLocation(loc)) {
            addCategorizedRecord(stats, 'livesHanded', info);
            if (!isDisruptionNote(info.notes, 'livesHanded') && isLiveDropCarrier(carrier)) stats.liveDrops.push(info);
        }
    });
    return stats;
}

async function reconcileAndDisplay() {
    if (!ymsData.length || !dockdashData.length) return;
    
    updateActionPanel({ reconciled: false, message: 'Processing with Hub...' });

    try {
        const ymsIsaSet = new Set();
        const ymsLookup = {}; 
        
        ymsData.forEach(r => { 
            const isa = extractYmsIsa(r); 
            if (isa) {
                ymsIsaSet.add(isa);
                ymsLookup[isa] = {
                    location: normalize(getField(r, "LOCATION")),
                    dwell: getField(r, "YARD DWELL"),
                    fullLoadId: getField(r, "LOAD IDENTIFIER(S)"),
                    notes: (getField(r, "NOTES") || "").toUpperCase(),
                    owner: (getField(r, "OWNER (OPERATOR)") || getField(r, "OWNER") || "").toUpperCase(),
                    carrier: getYmsCarrier(r),
                    loadType: normalize(getField(r, "CARRIER LOAD TYPE"))
                };
            }
        });

        const dockdashIsaSet = new Set();
        const finalMetricsData = [];
        const excludedRecords = [];

        dockdashData.forEach(r => {
            let isa = normalize(getField(r, "ISA"));
            if (!isa || isa.includes("E+") || isa.length < 5) return; 
            dockdashIsaSet.add(isa);
            
            if (ymsIsaSet.has(isa)) {
                finalMetricsData.push({
                    ...r,
                    __YMS_NOTES: ymsLookup[isa]?.notes || ""
                });
            } else {
                excludedRecords.push({ isa, vrid: normalize(getField(r, "VRID")), location: getField(r, "LOCATION") });
            }
        });

        const researchQueueRecords = []; 
        const autoAssignedGhosts = [];

        // GHOST PROCESSING (Logic: Hub -> Memory -> Auto)
        ymsData.forEach(r => {
            const isa = extractYmsIsa(r);
            if (isa && !dockdashIsaSet.has(isa)) {
                const ymsInfo = ymsLookup[isa];
                let vrid = 'UNKNOWN';
                if (ymsInfo.fullLoadId) {
                    const match = ymsInfo.fullLoadId.match(/VRID\W*([A-Z0-9]+)/i);
                    if (match) vrid = normalize(match[1]);
                }

                let oculusMatch = null;
                let finalCategory = null;

                if (typeof recallOculusTrailer === 'function') {
                    oculusMatch = recallOculusTrailer(isa);
                    if (oculusMatch) finalCategory = resolveOculusCategory(oculusMatch, ymsInfo);
                }

                // --- MEMORY CHECK ---
                let memory = null;
                if ((!oculusMatch || !finalCategory) && !isMemoryBypassEnabled() && typeof recallTrailer === 'function') {
                    memory = recallTrailer(isa, vrid);
                }

                if (oculusMatch && finalCategory && !(oculusMatch.units > 0)) {
                    researchQueueRecords.push({
                        isa,
                        vrid,
                        location: ymsInfo.location,
                        dwell: ymsInfo.dwell,
                        notes: `OCULUS ${normalize(oculusMatch.sourceType)} matched but units were missing: ${ymsInfo.notes}`,
                        owner: ymsInfo.owner,
                        suggestedCategory: finalCategory,
                        confidence: 'MEDIUM'
                    });
                } else if (oculusMatch && finalCategory) {
                    autoAssignedGhosts.push({
                        isa, vrid: oculusMatch.vrid || vrid,
                        location: ymsInfo.location, dwell: ymsInfo.dwell,
                        category: finalCategory,
                        units: oculusMatch.units,
                        cartons: oculusMatch.cartons,
                        pallets: oculusMatch.pallets,
                        carrier: ymsInfo.carrier, loadType: ymsInfo.loadType,
                        isMemory: true,
                        notes: `OCULUS ${normalize(oculusMatch.sourceType)}: ${ymsInfo.notes}`
                    });
                } else if (memory) {
                    autoAssignedGhosts.push({
                        isa, vrid, location: ymsInfo.location, dwell: ymsInfo.dwell,
                        category: memory.category, units: memory.units,
                        carrier: ymsInfo.carrier, loadType: ymsInfo.loadType,
                        isMemory: true, notes: `MEM: ${ymsInfo.notes}`
                    });
                } else {
                    const inferred = inferYmsOnlyCategory(ymsInfo);
                    if (inferred) {
                        if (inferred.category) {
                            autoAssignedGhosts.push({
                                isa, vrid,
                                location: ymsInfo.location, dwell: ymsInfo.dwell,
                                category: inferred.category,
                                units: 0,
                                carrier: ymsInfo.carrier,
                                loadType: ymsInfo.loadType,
                                isMemory: false,
                                confidence: inferred.confidence,
                                notes: `${inferred.reason}: ${ymsInfo.notes}`
                            });
                        }
                        return;
                    }

                    // Send to Research Queue
                    researchQueueRecords.push({ 
                        isa, vrid, location: ymsInfo.location, dwell: ymsInfo.dwell, 
                        notes: ymsInfo.notes, owner: ymsInfo.owner,
                        suggestedCategory: 'dropPallets', confidence: 'LOW'
                    });
                }
            }
        });

        lastProcessedStats = calculateMetrics(finalMetricsData, excludedRecords);
        const oldestSpd = findOldestSpdRecord(dockdashData, ymsLookup);
        lastProcessedStats.oldestSpd = oldestSpd ? {
            isa: oldestSpd.isa,
            date: formatSpdDate(oldestSpd.spdDate)
        } : null;

        const oldestTrailer = findOldestTrailerInYard(dockdashData, ymsLookup);
        lastProcessedStats.oldestTrailer = oldestTrailer ? {
            isa: oldestTrailer.isa,
            dwellHours: oldestTrailer.dwellHours
        } : null;
        
        autoAssignedGhosts.forEach(ghost => {
            if (
                Array.isArray(lastProcessedStats[ghost.category]) &&
                categoryAllowsLocation(ghost.category, ghost.location)
            ) {
                addCategorizedRecord(lastProcessedStats, ghost.category, ghost);
                if (
                    ghost.category === 'livesHanded' &&
                    ghost.loadType === "LIVE" &&
                    !isDisruptionNote(ghost.notes, 'livesHanded') &&
                    isLiveDropCarrier(ghost.carrier)
                ) {
                    lastProcessedStats.liveDrops.push(ghost);
                }
            }
            if (isDoorLocation(ghost.location)) lastProcessedStats.volumeDoors += (ghost.units || 0);
            else if (isYardLocation(ghost.location)) lastProcessedStats.volumeYard += (ghost.units || 0);
        });

        collectUnassignedYardParcels(ymsData).forEach(parcel => {
            addCategorizedRecord(lastProcessedStats, 'parcelsYard', parcel);
        });

        lastProcessedStats.researchQueueRecords = researchQueueRecords;
        lastProcessedStats.researchQueue = researchQueueRecords.length;

        updateMetricsUI(lastProcessedStats);
        
        const exportBtn = document.getElementById('export-btn');
        if(exportBtn) exportBtn.disabled = false;

        updateActionPanel({ 
            reconciled: true, 
            excluded: excludedRecords.length, 
            azngOver72: lastProcessedStats.azngOver72.length, 
            researchQueue: lastProcessedStats.researchQueue,
            message: `Resolved ${autoAssignedGhosts.length} items via Hub/Memory/notes. ${researchQueueRecords.length} need review.`
        });
        
        copyStatsToClipboard(lastProcessedStats);

    } catch (error) {
        console.error("Reconcile Error:", error);
        alert(`CRASH: ${error.message}\nCheck console.`);
        updateActionPanel({ reconciled: false, message: 'Process Failed' });
    }
}

// =========================================================================
// 8. CSV Export Logic (Improved & Verified)
// =========================================================================
function exportVerifiedCsv() {
    console.log("Export process started...");

    if (!dockdashData || dockdashData.length === 0) {
        alert("Error: No Dock Dash data loaded to export.");
        return;
    }
    if (!ymsData || ymsData.length === 0) {
        alert("Error: No YMS data loaded for verification.");
        return;
    }

    const ymsMap = {};
    ymsData.forEach(row => {
        const isa = extractYmsIsa(row);
        if (isa) {
            ymsMap[isa] = { 
                loc: getField(row, "LOCATION") || "UNKNOWN", 
                notes: getField(row, "NOTES") || "" 
            };
        }
    });

    const validRows = [];
    const originalHeaders = Object.keys(dockdashData[0]);
    
    const exportHeaders = [...originalHeaders];
    if (!exportHeaders.includes("NOTES")) exportHeaders.push("NOTES");

    dockdashData.forEach(ddRow => {
        const isa = normalize(getField(ddRow, "ISA"));
        
        if (ymsMap[isa]) {
            const correctedRow = { ...ddRow };
            const locKey = Object.keys(correctedRow).find(k => k.toUpperCase().includes("LOCATION"));
            if (locKey) correctedRow[locKey] = ymsMap[isa].loc;
            correctedRow["NOTES"] = ymsMap[isa].notes;
            validRows.push(correctedRow);
        }
    });

    console.log(`Verification complete. Matches found: ${validRows.length}`);

    if (validRows.length === 0) {
        alert("No matching verified records found.\n\nThis usually means the ISAs in your YMS file don't match the ISAs in your Dock Dash file.");
        return;
    }

    try {
        const csvContent = [
            exportHeaders.join(","), 
            ...validRows.map(row => 
                exportHeaders.map(fieldName => {
                    let val = row[fieldName] || "";
                    return `"${String(val).replace(/"/g, '""')}"`;
                }).join(",")
            )
        ].join("\n");

        if (!window.api.saveCsv) {
            throw new Error('Save API is not available.');
        }

        window.api.saveCsv(csvContent).then(success => {
            if (success) {
                alert(`Verified export saved.\n(${validRows.length} trailers exported)`);
            }
        });
    } catch (err) {
        console.error("Export Error:", err);
        alert("Failed to generate CSV file: " + err.message);
    }
}

// =========================================================================
// 9. Initialization & Events
// =========================================================================
function setupCosmicBackground() {
    const starfield = document.getElementById('starfield');
    if (!starfield) return;
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDuration = `${2 + Math.random() * 3}s`;
        starfield.appendChild(star);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    console.log("App started: DOM content loaded");

    setupMonitorAwareScaling();
    setupCosmicBackground();

    
    if (window.api && window.api.getAppVersion) {
        window.api.getAppVersion().then(v => {
            const el = document.getElementById('eos-version');
            if (el) el.textContent = `Version: ${v}`;
        });
    }

    // 2. Button Listeners 
    const ymsBtn = document.getElementById('browse-yms-btn');
    if (ymsBtn) {
        ymsBtn.addEventListener('click', () => handleFileSelection('yms'));
        console.log("YMS button connected");
    }

    const clearYmsBtn = document.getElementById('clear-yms-btn');
    if (clearYmsBtn) {
        clearYmsBtn.addEventListener('click', () => clearLoadedFile('yms'));
    }

    const ddBtn = document.getElementById('browse-dockdash-btn');
    if (ddBtn) {
        ddBtn.addEventListener('click', () => handleFileSelection('dockdash'));
        console.log("Dock Dash button connected");
    }

    const clearDockdashBtn = document.getElementById('clear-dockdash-btn');
    if (clearDockdashBtn) {
        clearDockdashBtn.addEventListener('click', () => clearLoadedFile('dockdash'));
    }
    
    // --- UPDATED: HUB BUTTON LISTENER ---
    const hubBtn = document.getElementById('open-hub-btn');
    if (hubBtn) {
        hubBtn.addEventListener('click', () => {
            document.getElementById('research-hub-modal').style.display = 'block';
            updateOculusSyncButton();
        });
        console.log("Hub button connected");
    }

    const oculusVendorBtn = document.getElementById('browse-oculus-vendor-btn');
    if (oculusVendorBtn) {
        oculusVendorBtn.addEventListener('click', () => handleOculusFileSelection('vendor'));
    }

    const clearOculusVendorBtn = document.getElementById('clear-oculus-vendor-btn');
    if (clearOculusVendorBtn) {
        clearOculusVendorBtn.addEventListener('click', () => clearOculusUpload('vendor'));
    }

    const oculusTransshipBtn = document.getElementById('browse-oculus-transship-btn');
    if (oculusTransshipBtn) {
        oculusTransshipBtn.addEventListener('click', () => handleOculusFileSelection('transship'));
    }

    const clearOculusTransshipBtn = document.getElementById('clear-oculus-transship-btn');
    if (clearOculusTransshipBtn) {
        clearOculusTransshipBtn.addEventListener('click', () => clearOculusUpload('transship'));
    }
    
    const recBtn = document.getElementById('reconcile-btn');
    if (recBtn) {
        recBtn.addEventListener('click', reconcileAndDisplay);
        console.log("Reconcile button connected");
    }

    const expBtn = document.getElementById('export-btn');
    if (expBtn) {
        expBtn.addEventListener('click', exportVerifiedCsv);
        console.log("Export button connected");
    }

    const fcApiBtn = document.getElementById('test-fc-api-btn');
    if (fcApiBtn) {
        fcApiBtn.addEventListener('click', testFcApiForResearchQueue);
        console.log("FC API test button connected");
    }

    // 3. Tile Listeners
    const tiles = document.querySelectorAll('.metric-tile');
    console.log(`Found ${tiles.length} metric tiles.`);
    
    tiles.forEach(tile => {
        tile.addEventListener('click', (e) => {
            console.log("Tile clicked:", e.currentTarget.id);
            showDetailModal(e.currentTarget.id);
        });
    });
    
    const modal = document.getElementById('detail-modal');
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => { 
            if (e.target === modal) modal.style.display = 'none';
            // Also close Hub Modal if clicked outside
            if (e.target === document.getElementById('research-hub-modal')) {
                document.getElementById('research-hub-modal').style.display = 'none';
            }
        });
    }
    
    // 4. Initial Status
    updateCardStatus('yms', 'Select YMS File', null); 
    updateCardStatus('dockdash', 'Select Dock Dash File', null); 
    refreshOculusMemoryCard();
    updateOculusSyncButton();
    updateRequiredFileControls();
});





        /* EOS_RUNTIME_READY */
    }

    function readMemory() {
        const raw = typeof GM_getValue === 'function' ? GM_getValue(storageKey, '{}') : '{}';
        const values = JSON.parse(raw);
        if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Invalid saved EOS memory');
        return values;
    }

    function openEos() {
        if (overlay) { overlay.style.setProperty('display', 'block', 'important'); return; }
        overlay = hostDocument.createElement('div');
        overlay.id = 'gyr2-eos-slack-overlay';
        overlay.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;background:#0b121a!important';
        const root = overlay.attachShadow({ mode: 'closed' });
        // Constructed sheets and extension listeners do not depend on inline page scripts.
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(appCss + `
            :host{font:15px "Segoe UI",sans-serif;color:#eef4f8}
            .eos-root{height:100vh;overflow:auto;position:relative;isolation:isolate;background:var(--bg)}
            .eos-toolbar{position:sticky;top:0;z-index:5000;display:flex;gap:16px;align-items:center;padding:6px 12px;background:#13303b;color:#fff;font:13px sans-serif}
            .eos-toolbar button{margin-left:auto;padding:5px 12px;cursor:pointer;background:#edf2f5;color:#172332;border:1px solid #8796a5;border-radius:3px}
            .eos-body{min-height:calc(100vh - 38px);background:transparent}
            .fas,.far,.fa{display:inline-block;line-height:1;font-style:normal}
            .fas svg,.far svg,.fa svg{vertical-align:-.125em;overflow:visible}
            .fa-5x{font-size:5em}
        `);
        root.adoptedStyleSheets = [sheet];
        const appRoot = hostDocument.createElement('div');
        appRoot.className = 'eos-root';
        const bar = hostDocument.createElement('div');
        bar.className = 'eos-toolbar';
        const label = hostDocument.createElement('span');
        label.textContent = 'EOS for Slack | Desktop memory is separate | Close hides EOS; refreshing clears loaded CSVs';
        const close = hostDocument.createElement('button');
        close.textContent = 'Close EOS';
        close.addEventListener('click', () => { overlay.style.setProperty('display', 'none', 'important'); });
        bar.append(label, close);
        const body = hostDocument.createElement('div');
        body.className = 'eos-body';
        replaceEosMarkup(body, appBodyHtml);
        appRoot.append(bar, body);
        root.append(appRoot);
        hostDocument.documentElement.appendChild(overlay);
        installEosIcons(root, hostDocument, icons);

        const ready = [];
        const messages = [];
        const channel = Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-');
        let memoryError = '';
        let values = {};
        try { values = readMemory(); } catch (error) { memoryError = error.message; }
        const reply = data => messages.forEach(callback => callback({ source: parentBridge, data: { eosChannel: channel, ...data } }));
        const parentBridge = {
            async postMessage(data) {
                if (data.action === 'ready' && memoryError) reply({ action: 'warning', message: 'EOS memory could not be loaded: ' + memoryError });
                if (data.action === 'storage') {
                    try {
                        const current = readMemory();
                        if (data.value === null) delete current[data.key];
                        else Object.defineProperty(current, data.key, { value: String(data.value), enumerable: true, configurable: true });
                        GM_setValue(storageKey, JSON.stringify(current));
                    } catch (error) { reply({ action: 'warning', message: 'EOS memory could not be saved: ' + error.message }); }
                }
                if (data.action === 'clipboard') {
                    let ok = false;
                    try { GM_setClipboard(data.text, 'text'); ok = true; } catch (_) {}
                    reply({ id: data.id, ok });
                }
            }
        };
        const appWindow = {
            __EOS_BOOT__: { values, channel, version: appVersion },
            get innerWidth() { return hostWindow.innerWidth; },
            get innerHeight() { return hostWindow.innerHeight - bar.offsetHeight; },
            addEventListener(type, callback, options) {
                if (type === 'DOMContentLoaded') ready.push(callback);
                else if (type === 'message') messages.push(callback);
                else if (type === 'click') root.addEventListener(type, callback, options);
                else if (type === 'resize') hostWindow.addEventListener(type, callback, options);
            },
            print() {
                const printSheet = new CSSStyleSheet();
                printSheet.replaceSync('@media print { body { display:none!important } #gyr2-eos-slack-overlay { position:static!important } }');
                const original = hostDocument.adoptedStyleSheets;
                hostDocument.adoptedStyleSheets = [...original, printSheet];
                try { hostWindow.print(); } finally { hostDocument.adoptedStyleSheets = original; }
            }
        };
        const appDocument = {
            body, documentElement: appRoot,
            get activeElement() { return root.activeElement; },
            getElementById: id => root.getElementById(id),
            querySelector: selector => root.querySelector(selector),
            querySelectorAll: selector => root.querySelectorAll(selector),
            createElement: hostDocument.createElement.bind(hostDocument),
            createElementNS: hostDocument.createElementNS.bind(hostDocument),
            createTextNode: hostDocument.createTextNode.bind(hostDocument),
            addEventListener: root.addEventListener.bind(root),
            removeEventListener: root.removeEventListener.bind(root)
        };
        const session = new Map();
        try {
            runApp(appWindow, appDocument, parentBridge, {
                getItem: key => session.get(key) ?? null,
                setItem: (key, value) => session.set(key, String(value))
            });
            root.addEventListener('click', event => {
                const button = event.target.closest?.('button');
                if (!button || button.disabled) return;
                if (button.dataset.eosEdit !== undefined) appWindow.editResearchItem(Number(button.dataset.eosEdit));
                if (button.dataset.eosMove !== undefined) appWindow.moveResearchItem(Number(button.dataset.eosMove));
                if (button.dataset.eosAction === 'sync') appWindow.processHubData();
                if (button.dataset.eosAction === 'cancel-hub') root.getElementById('research-hub-modal').style.display = 'none';
            });
            ready.forEach(callback => callback());
        } catch (error) {
            label.textContent = 'EOS could not start: ' + error.message;
            console.error('EOS startup failed', error);
        }
    }

    // A separate closed root keeps Slack's button rules out of the EOS launcher.
    const launcher = hostDocument.createElement('div');
    launcher.id = 'gyr2-eos-slack-launcher';
    launcher.style.cssText = 'all:initial!important;position:fixed!important;bottom:24px!important;right:24px!important;z-index:2147483646!important';
    const launcherRoot = launcher.attachShadow({ mode: 'closed' });
    const launchButton = hostDocument.createElement('button');
    launchButton.textContent = 'Open EOS';
    launchButton.style.cssText = 'padding:14px 22px;border:1px solid #ffc36b;border-radius:8px;background:#ffad32;color:#172332;font:bold 16px sans-serif;cursor:pointer';
    launchButton.addEventListener('click', () => {
        try { openEos(); } catch (error) { hostWindow.alert('EOS could not open: ' + error.message); }
    });
    launcherRoot.appendChild(launchButton);
    hostDocument.documentElement.appendChild(launcher);
})();
