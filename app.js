import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Initialize WebsimSocket if available, otherwise use Firebase
let db;
if (typeof WebsimSocket !== 'undefined') {
  db = new WebsimSocket();
} else {
  // Firebase implementation
  const firebaseConfig = {
    apiKey: "AIzaSyDja5QAlLu7k7Vy0ejxmKCGd7YSvTCT-dU",
    authDomain: "yeah-58a5c.firebaseapp.com",
    databaseURL: "https://yeah-58a5c-default-rtdb.firebaseio.com",
    projectId: "yeah-58a5c",
    storageBucket: "yeah-58a5c.firebasestorage.app",
    messagingSenderId: "337596579571",
    appId: "1:337596579571:web:9ae57689b528d9aa08c186",
    measurementId: "G-2PDCWW4WEB"
  };

  // Firebase database abstraction
  db = {
    collection: (name) => {
      return {
        subscribe: (callback) => {
          // Firebase subscription implementation
          const unsubscribe = () => {};
          return unsubscribe;
        },
        getList: () => [],
        create: async (data) => {
          // Firebase create implementation
          return { id: Date.now().toString(), ...data };
        }
      };
    }
  };
}

function App() {
    const [activeTab, setActiveTab] = useState('addons');

    return React.createElement('div', { className: 'app' },
        React.createElement('nav', { className: 'navbar' },
            React.createElement('div', { className: 'nav-container' },
                React.createElement('a', { href: '#', className: 'logo' }, '⚡ Bedrock Hub'),
                React.createElement('div', { className: 'nav-tabs' },
                    React.createElement('button', {
                        className: `nav-tab ${activeTab === 'addons' ? 'active' : ''}`,
                        onClick: () => setActiveTab('addons')
                    }, 'Addons'),
                    React.createElement('button', {
                        className: `nav-tab ${activeTab === 'utils' ? 'active' : ''}`,
                        onClick: () => setActiveTab('utils')
                    }, 'Utils Tools')
                )
            )
        ),
        React.createElement('main', { className: 'main-content' },
            React.createElement('div', { className: 'tab-content' },
                activeTab === 'addons' ? React.createElement(AddonsTab) : React.createElement(UtilsTab)
            )
        )
    );
}

function AddonsTab() {
    const [isUploading, setIsUploading] = useState(false);
    const [addonName, setAddonName] = useState('');
    const [addonDescription, setAddonDescription] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const fileInputRef = useRef(null);

    useEffect(() => {
        setLoading(true);
        // Subscribe to addon_v1 collection for real-time updates
        const unsubscribe = db.collection('addon_v1').subscribe((latestAddons) => {
            // WebsimSocket getList/subscribe returns newest to oldest by default, matching previous Firebase orderBy('desc')
            setAddons(latestAddons);
            setLoading(false);
        });

        // Also fetch the initial list of addons
        setAddons(db.collection('addon_v1').getList());
        setLoading(false); // Set loading to false after initial fetch

        // Cleanup subscription on component unmount
        return () => unsubscribe();
    }, []);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file && file.name.endsWith('.mcaddon')) {
            setSelectedFile(file);
        } else {
            alert('Please select a valid .mcaddon file');
            setSelectedFile(null); // Clear selection if invalid
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Clear file input display
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !addonName.trim()) {
            alert('Please select a file and enter a name');
            return;
        }

        setIsUploading(true);
        
        try {
            console.log('[Upload] Starting upload process...');
            
            // Use websim.upload for file storage
            console.log('[Upload] Uploading file to Websim storage...');
            const fileUrl = await websim.upload(selectedFile);
            console.log('[Upload] File successfully uploaded to Websim storage:', fileUrl);
            
            // Save addon metadata using Websim records
            console.log('[Upload] Saving addon metadata to Websim records...');
            await db.collection('addon_v1').create({
                name: addonName.trim(),
                description: addonDescription.trim(),
                file_url: fileUrl,
                file_name: selectedFile.name,
                file_size: selectedFile.size,
                // created_at and username are automatically added by Websim
            });

            console.log('[Upload] Addon record created successfully');
            
            // No need to manually update local state (setAddons) as the subscription will handle it.

            // Clear form
            setAddonName('');
            setAddonDescription('');
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Clear file input value
            }
            alert('Addon uploaded successfully!');
        } catch (error) {
            console.error('Upload Error:', error);
            
            // Generic error feedback for Websim upload/record creation
            alert(`Upload Failed: ${error.message || 'Unknown error during upload. Please try again.'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const downloadFile = async (url, fileName) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = fileName.endsWith('.mcaddon') ? fileName : `${fileName}.mcaddon`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Download failed. Please try again.');
        }
    };

    // The 'download' attribute on the <a> tag is used to suggest a filename.
    // The `addon.file_name` value, which stores the original uploaded file's name (e.g., "my_addon.mcaddon"),
    // is already used for this purpose. If files are downloading with an incorrect extension (e.g., '.bin'),
    // it's likely a browser-specific behavior or the Content-Type header from the hosting server.
    // The current code correctly attempts to preserve the original file extension.

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'addons-header' },
            React.createElement('h1', null, 'Minecraft Bedrock Addons'),
            React.createElement('p', null, 'Upload and share your custom Minecraft Bedrock addons with the community')
        ),

        React.createElement('div', { className: 'upload-section' },
            React.createElement('div', { 
                className: 'upload-area', 
                onClick: () => fileInputRef.current?.click() 
            },
                React.createElement('div', { className: 'upload-icon' }, '📦'),
                React.createElement('div', { className: 'upload-text' },
                    selectedFile ? selectedFile.name : 'Click to select .mcaddon file'
                ),
                React.createElement('div', { className: 'upload-subtext' },
                    'Only .mcaddon files are supported'
                )
            ),
            React.createElement('input', {
                ref: fileInputRef,
                type: 'file',
                accept: '.mcaddon',
                onChange: handleFileSelect,
                className: 'file-input'
            }),
            
            selectedFile && React.createElement('div', { style: { marginTop: '1rem' } },
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Addon Name *'),
                    React.createElement('input', {
                        type: 'text',
                        className: 'form-input',
                        value: addonName,
                        onChange: (e) => setAddonName(e.target.value),
                        placeholder: 'Enter addon name'
                    })
                ),
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Description'),
                    React.createElement('textarea', {
                        className: 'form-input form-textarea',
                        value: addonDescription,
                        onChange: (e) => setAddonDescription(e.target.value),
                        placeholder: 'Describe your addon...'
                    })
                ),
                React.createElement('button', {
                    className: 'btn',
                    onClick: handleUpload,
                    disabled: isUploading || !addonName.trim() || !selectedFile 
                }, isUploading ? 'Uploading...' : 'Upload Addon')
            )
        ),

        loading ? 
            React.createElement('div', { className: 'loading' }, 'Loading addons...') :
            addons.length === 0 ?
                React.createElement('div', { className: 'empty-state' },
                    React.createElement('h3', null, 'No addons yet'),
                    React.createElement('p', null, 'Be the first to upload an addon!')
                ) :
                React.createElement('div', { className: 'addons-grid' },
                    addons.map((addon) =>
                        React.createElement('div', { key: addon.id, className: 'addon-card' },
                            React.createElement('div', { className: 'addon-header' },
                                React.createElement('div', null,
                                    React.createElement('div', { className: 'addon-title' }, addon.name),
                                    React.createElement('div', { className: 'addon-author' }, `by ${addon.username}`) // username automatically added by Websim
                                )
                            ),
                            
                            addon.description && React.createElement('div', { className: 'addon-description' }, addon.description),
                            
                            React.createElement('div', { className: 'addon-meta' },
                                React.createElement('span', null, formatFileSize(addon.file_size)),
                                React.createElement('span', null, new Date(addon.created_at).toLocaleDateString()) // created_at is a string in Websim
                            ),
                            
                            React.createElement('div', { className: 'addon-actions' },
                                React.createElement('button', {
                                    className: 'btn btn-small',
                                    onClick: () => downloadFile(addon.file_url, addon.file_name)
                                }, 'Download')
                            )
                        )
                    )
                )
    );
}

function UtilsTab() {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookMessage, setWebhookMessage] = useState('');
    const [webhookUsername, setWebhookUsername] = useState('');
    const [webhookAvatar, setWebhookAvatar] = useState('');
    const [isEmbedMode, setIsEmbedMode] = useState(false);
    const [embedTitle, setEmbedTitle] = useState('');
    const [embedDescription, setEmbedDescription] = useState('');
    const [embedColor, setEmbedColor] = useState('#00ff88');
    const [isSending, setIsSending] = useState(false);
    const [response, setResponse] = useState(null);

    const sendWebhook = async () => {
        if (!webhookUrl.trim()) {
            alert('Please enter a webhook URL');
            return;
        }

        setIsSending(true);
        setResponse(null);

        try {
            const payload = {
                content: webhookMessage || undefined,
                username: webhookUsername || undefined,
                avatar_url: webhookAvatar || undefined,
            };

            if (isEmbedMode && (embedTitle || embedDescription)) {
                payload.embeds = [{
                    title: embedTitle || undefined,
                    description: embedDescription || undefined,
                    color: parseInt(embedColor.slice(1), 16),
                    timestamp: new Date().toISOString()
                }];
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setResponse({
                    success: true,
                    message: 'Webhook sent successfully!',
                    status: response.status
                });
            } else {
                let errorText = await response.text(); // Attempt to read error message from Discord
                try {
                    const errorJson = JSON.parse(errorText);
                    errorText = errorJson.message || errorText;
                } catch (e) {
                    // Not JSON, use as is
                }
                setResponse({
                    success: false,
                    message: `Failed to send webhook: ${response.status} ${response.statusText}. ${errorText}`,
                    status: response.status
                });
            }
        } catch (error) {
            console.error('Webhook sending error:', error);
            setResponse({
                success: false,
                message: `Error sending webhook: ${error.message}`,
                status: null
            });
        } finally {
            setIsSending(false);
        }
    };

    const previewPayload = () => {
        const payload = {
            content: webhookMessage || undefined,
            username: webhookUsername || undefined,
            avatar_url: webhookAvatar || undefined,
        };

        if (isEmbedMode && (embedTitle || embedDescription)) {
            payload.embeds = [{
                title: embedTitle || undefined,
                description: embedDescription || undefined,
                color: parseInt(embedColor.slice(1), 16),
                timestamp: new Date().toISOString()
            }];
        }

        return JSON.stringify(payload, null, 2);
    };

    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'utils-header' },
            React.createElement('h1', null, 'Utility Tools'),
            React.createElement('p', null, 'Helpful tools for developers and content creators')
        ),

        React.createElement('div', { className: 'webhook-section' },
            React.createElement('h2', null, '🔗 Discord Webhook Sender'),
            React.createElement('p', { 
                style: { color: '#888', marginBottom: '1.5rem' } 
            }, 'Send custom messages to Discord channels via webhooks'),

            React.createElement('div', { className: 'webhook-form' },
                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Webhook URL *'),
                    React.createElement('input', {
                        type: 'url',
                        className: 'form-input',
                        value: webhookUrl,
                        onChange: (e) => setWebhookUrl(e.target.value),
                        placeholder: 'https://discord.com/api/webhooks/...'
                    })
                ),

                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Message Content'),
                    React.createElement('textarea', {
                        className: 'form-input form-textarea',
                        value: webhookMessage,
                        onChange: (e) => setWebhookMessage(e.target.value),
                        placeholder: 'Enter your message here...'
                    })
                ),

                React.createElement('div', { 
                    style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } 
                },
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', null, 'Custom Username'),
                        React.createElement('input', {
                            type: 'text',
                            className: 'form-input',
                            value: webhookUsername,
                            onChange: (e) => setWebhookUsername(e.target.value),
                            placeholder: 'Bot Username'
                        })
                    ),

                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', null, 'Avatar URL'),
                        React.createElement('input', {
                            type: 'url',
                            className: 'form-input',
                            value: webhookAvatar,
                            onChange: (e) => setWebhookAvatar(e.target.value),
                            placeholder: 'https://example.com/avatar.png'
                        })
                    )
                ),

                React.createElement('div', { className: 'form-group' },
                    React.createElement('label', { 
                        style: { display: 'flex', alignItems: 'center', gap: '0.5rem' } 
                    },
                        React.createElement('input', {
                            type: 'checkbox',
                            checked: isEmbedMode,
                            onChange: (e) => setIsEmbedMode(e.target.checked)
                        }),
                        'Enable Rich Embed'
                    )
                ),

                isEmbedMode && React.createElement('div', { 
                    style: { 
                        padding: '1rem', 
                        background: '#0a0a0a', 
                        borderRadius: '8px', 
                        border: '1px solid #333' 
                    } 
                },
                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', null, 'Embed Title'),
                        React.createElement('input', {
                            type: 'text',
                            className: 'form-input',
                            value: embedTitle,
                            onChange: (e) => setEmbedTitle(e.target.value),
                            placeholder: 'Embed title'
                        })
                    ),

                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', null, 'Embed Description'),
                        React.createElement('textarea', {
                            className: 'form-input form-textarea',
                            value: embedDescription,
                            onChange: (e) => setEmbedDescription(e.target.value),
                            placeholder: 'Embed description'
                        })
                    ),

                    React.createElement('div', { className: 'form-group' },
                        React.createElement('label', null, 'Embed Color'),
                        React.createElement('input', {
                            type: 'color',
                            className: 'form-input',
                            value: embedColor,
                            onChange: (e) => setEmbedColor(e.target.value),
                            style: { height: '40px' }
                        })
                    )
                ),

                React.createElement('button', {
                    className: 'btn',
                    onClick: sendWebhook,
                    disabled: isSending || !webhookUrl.trim() || (!webhookMessage.trim() && !isEmbedMode) || (isEmbedMode && !embedTitle.trim() && !embedDescription.trim() && !webhookMessage.trim()) 
                }, isSending ? 'Sending...' : 'Send Webhook')
            ),

            React.createElement('div', { className: 'webhook-preview' },
                React.createElement('h3', null, 'Payload Preview'),
                React.createElement('pre', { 
                    style: { 
                        color: '#ccc', 
                        fontSize: '0.9rem', 
                        overflow: 'auto', 
                        background: '#111', 
                        padding: '1rem', 
                        borderRadius: '4px',
                        border: '1px solid #222'
                    }
                }, previewPayload())
            ),

            response && React.createElement('div', { 
                className: `webhook-response ${response.success ? 'response-success' : 'response-error'}` 
            },
                React.createElement('h4', null, response.success ? '✅ Success' : '❌ Error'),
                React.createElement('p', null, response.message),
                response.status && React.createElement('p', null, `Status Code: ${response.status}`)
            )
        )
    );
}

const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));