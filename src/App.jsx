import React, { useState, useEffect } from 'react';

// Translations
import { translations } from './translations';


function App() {
    const [lang, setLang] = useState('zh');
    const t = translations[lang];
    const [config, setConfig] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [apiKeyInputs, setApiKeyInputs] = useState({}); // Store API key input values per provider

    useEffect(() => {
        loadConfig();
    }, []);

    // Fetch existing env var value when provider is selected
    useEffect(() => {
        if (selectedProvider && config?.provider?.[selectedProvider]) {
            const providerData = config.provider[selectedProvider];
            const envName = (providerData.name || selectedProvider).toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_API_KEY';
            window.electronAPI.getEnvVar(envName).then(value => {
                if (value) {
                    setApiKeyInputs(prev => ({ ...prev, [selectedProvider]: value }));
                }
            });
        }
    }, [selectedProvider, config]);

    // Auto-save when config changes
    useEffect(() => {
        if (config && !loading) {
            const saveTimeout = setTimeout(async () => {
                try {
                    // Auto update apiKey for all providers
                    const configToSave = { ...config };
                    if (configToSave.provider) {
                        Object.keys(configToSave.provider).forEach(key => {
                            const provider = configToSave.provider[key];
                            if (!provider.options) provider.options = {};
                            // Always enforce the env var naming convention based on NAME
                            const sourceName = provider.name || key;
                            const envVarName = sourceName.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_API_KEY';
                            provider.options.apiKey = `{env:${envVarName}}`;
                        });
                    }
                    const result = await window.electronAPI.saveConfig(configToSave);
                    if (result.error) {
                        console.error('Auto-save failed:', result.error);
                        setStatusMessage(t.autoSaveFailed);
                    } else {
                        setStatusMessage(t.saved);
                    }
                    setTimeout(() => setStatusMessage(''), 2000);
                } catch (err) {
                    console.error('Auto-save error:', err);
                }
            }, 500); // Debounce 500ms
            return () => clearTimeout(saveTimeout);
        }
    }, [config, loading]);

    const loadConfig = async () => {
        try {
            const data = await window.electronAPI.getConfig();
            if (data.error) throw new Error(data.error);
            setConfig(data);
            if (data.provider) {
                const firstProvider = Object.keys(data.provider)[0];
                if (firstProvider) setSelectedProvider(firstProvider);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setStatusMessage('保存中...');

            // Auto update apiKey for all providers
            const configToSave = { ...config };
            if (configToSave.provider) {
                Object.keys(configToSave.provider).forEach(key => {
                    const provider = configToSave.provider[key];
                    if (!provider.options) provider.options = {};
                    // Always enforce the env var naming convention based on NAME
                    const sourceName = provider.name || key;
                    const envVarName = sourceName.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_API_KEY';
                    provider.options.apiKey = `{env:${envVarName}}`;
                });
            }

            const result = await window.electronAPI.saveConfig(configToSave);
            if (result.error) throw new Error(result.error);
            setStatusMessage('保存成功！');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (err) {
            setError(err.message);
            setStatusMessage('保存失败。');
        }
    };

    const updateProviderOption = (key, value) => {
        setConfig(prev => ({
            ...prev,
            provider: {
                ...prev.provider,
                [selectedProvider]: {
                    ...prev.provider[selectedProvider],
                    options: {
                        ...prev.provider[selectedProvider].options,
                        [key]: value
                    }
                }
            }
        }));
    };

    const updateProviderName = (value) => {
        setConfig(prev => ({
            ...prev,
            provider: {
                ...prev.provider,
                [selectedProvider]: {
                    ...prev.provider[selectedProvider],
                    name: value
                }
            }
        }));
    };

    const updateProviderNpm = (value) => {
        setConfig(prev => ({
            ...prev,
            provider: {
                ...prev.provider,
                [selectedProvider]: {
                    ...prev.provider[selectedProvider],
                    npm: value
                }
            }
        }));
    };

    const renameProviderKey = (newKey) => {
        const oldKey = selectedProvider;
        if (oldKey === newKey || !newKey.trim()) return;

        if (config.provider[newKey]) {
            alert(t.idExists);
            return;
        }

        const newProviders = {};
        for (const [k, v] of Object.entries(config.provider)) {
            if (k === oldKey) {
                newProviders[newKey] = v;
            } else {
                newProviders[k] = v;
            }
        }

        setConfig(prev => ({
            ...prev,
            provider: newProviders
        }));
        setSelectedProvider(newKey);
    };

    const updateModel = (modelKey, field, value) => {
        setConfig(prev => ({
            ...prev,
            provider: {
                ...prev.provider,
                [selectedProvider]: {
                    ...prev.provider[selectedProvider],
                    models: {
                        ...prev.provider[selectedProvider].models,
                        [modelKey]: {
                            ...prev.provider[selectedProvider].models[modelKey],
                            [field]: value
                        }
                    }
                }
            }
        }));
    };

    const deleteModel = (modelKey) => {
        const newModels = { ...config.provider[selectedProvider].models };
        delete newModels[modelKey];
        setConfig(prev => ({
            ...prev,
            provider: {
                ...prev.provider,
                [selectedProvider]: {
                    ...prev.provider[selectedProvider],
                    models: newModels
                }
            }
        }));
    };

    const renameModelKey = (oldKey, newKey) => {
        if (oldKey === newKey || !newKey.trim()) return;
        const models = config.provider[selectedProvider].models;
        if (models[newKey]) {
            alert('该模型标识已存在');
            return;
        }
        // Compute the new name from the key (part after '/')
        const newName = newKey.includes('/') ? newKey.split('/').pop() : newKey;
        const newModels = {};
        for (const [k, v] of Object.entries(models)) {
            if (k === oldKey) {
                newModels[newKey] = { ...v, name: newName };
            } else {
                newModels[k] = v;
            }
        }
        setConfig(prev => ({
            ...prev,
            provider: {
                ...prev.provider,
                [selectedProvider]: {
                    ...prev.provider[selectedProvider],
                    models: newModels
                }
            }
        }));
    };

    const addModel = () => {
        const newKey = "new-model-" + Date.now();
        setConfig(prev => ({
            ...prev,
            provider: {
                ...prev.provider,
                [selectedProvider]: {
                    ...prev.provider[selectedProvider],
                    models: {
                        ...prev.provider[selectedProvider].models,
                        [newKey]: { name: "New Model" }
                    }
                }
            }
        }));
    };

    const addProvider = () => {
        const newKey = "new-provider-" + Date.now();
        setConfig(prev => ({
            ...prev,
            provider: {
                ...prev.provider,
                [newKey]: {
                    name: "New Provider",
                    npm: "@ai-sdk/openai-compatible",
                    options: { baseURL: "https://api.example.com/v1/" },
                    models: {}
                }
            }
        }));
        setSelectedProvider(newKey);
    };

    const deleteProvider = () => {
        if (!window.confirm(t.confirmDelete)) return;
        const newProviders = { ...config.provider };
        delete newProviders[selectedProvider];

        setConfig(prev => ({
            ...prev,
            provider: newProviders
        }));

        const remainingKeys = Object.keys(newProviders);
        setSelectedProvider(remainingKeys.length > 0 ? remainingKeys[0] : null);
    };

    // UI components
    if (loading) return <div className="loading">{t.loading}</div>;
    if (error) return <div className="error">{t.error}: {error}</div>;
    if (!config || !config.provider) return <div className="error">{t.invalidConfig}</div>;

    const currentProviderData = config.provider[selectedProvider];

    return (
        <div className="container">
            <div className="title-bar">
                <span>Opencode Manager</span>
            </div>
            <div className="app-body">
                <div className="sidebar">
                    <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2>Config</h2>
                        <button className="add-btn" onClick={addProvider} title={t.addProvider}>+</button>
                    </div>
                    <ul className="provider-list">
                        {Object.keys(config.provider).map(pKey => (
                            <li
                                key={pKey}
                                className={selectedProvider === pKey ? 'active' : ''}
                                onClick={() => setSelectedProvider(pKey)}
                            >
                                {config.provider[pKey].name || pKey}
                            </li>
                        ))}
                    </ul>
                    <div className="sidebar-footer">
                        <button
                            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                            style={{ width: '100%', padding: '8px', background: 'var(--accent-color)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '8px' }}
                        >
                            {lang === 'zh' ? '🌐 English' : '🌐 中文'}
                        </button>
                        {statusMessage && <span className="status">{statusMessage}</span>}
                    </div>
                </div>

                <div className="main-content">
                    {selectedProvider && currentProviderData && (
                        <>
                            <header className="content-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="text"
                                        value={currentProviderData.name || ''}
                                        onChange={(e) => updateProviderName(e.target.value)}
                                        onBlur={(e) => renameProviderKey(e.target.value.trim())}
                                        placeholder={t.providerName}
                                        style={{ fontSize: '1.8rem', fontWeight: 'bold', background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent-color)', color: 'var(--text-primary)', outline: 'none', padding: '4px 0' }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <select
                                            value={currentProviderData.npm || '@ai-sdk/openai-compatible'}
                                            onChange={(e) => updateProviderNpm(e.target.value)}
                                            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.9rem', cursor: 'pointer' }}
                                        >
                                            <option value="@ai-sdk/openai-compatible">@ai-sdk/openai-compatible</option>
                                            <option value="@ai-sdk/anthropic">@ai-sdk/anthropic</option>
                                        </select>
                                    </div>
                                </div>
                                <button className="delete-btn" onClick={deleteProvider} style={{ fontSize: '1rem', border: '1px solid currentColor', borderRadius: '4px', padding: '4px 8px' }} title={t.deleteProvider}>{t.deleteProvider}</button>
                            </header>

                            <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '6px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{t.envVar}:</span>
                                    <code style={{ color: 'var(--accent-color)', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                        {(currentProviderData.name || selectedProvider).toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_API_KEY'}
                                    </code>
                                </div>
                                <button
                                    onClick={() => {
                                        const envName = (currentProviderData.name || selectedProvider).toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_API_KEY';
                                        navigator.clipboard.writeText(envName);
                                        const btn = document.getElementById('copy-btn-' + selectedProvider);
                                        if (btn) {
                                            const originalText = btn.innerText;
                                            btn.innerText = t.copied;
                                            setTimeout(() => btn.innerText = originalText, 1500);
                                        }
                                    }}
                                    id={'copy-btn-' + selectedProvider}
                                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    Copy
                                </button>
                            </div>

                            <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.apiKeyValue}:</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        value={apiKeyInputs[selectedProvider] || ''}
                                        onChange={(e) => setApiKeyInputs(prev => ({ ...prev, [selectedProvider]: e.target.value }))}
                                        placeholder="sk-xxxx..."
                                        style={{ flex: 1, fontFamily: 'monospace' }}
                                    />
                                    <button
                                        onClick={async () => {
                                            const envName = (currentProviderData.name || selectedProvider).toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_API_KEY';
                                            const keyValue = apiKeyInputs[selectedProvider];
                                            if (!keyValue) return;
                                            setStatusMessage(t.setting);
                                            const result = await window.electronAPI.setEnvVar(envName, keyValue);
                                            if (result.success) {
                                                setStatusMessage(t.setSuccess);
                                                // Keep the value in the input
                                            } else {
                                                setStatusMessage(t.setFailed + ': ' + (result.error || ''));
                                            }
                                            setTimeout(() => setStatusMessage(''), 5000);
                                        }}
                                        style={{ background: 'var(--accent-color)', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {t.setEnvVar}
                                    </button>
                                </div>
                            </div>


                            <section className="config-section">
                                <h3>{t.options}</h3>
                                <div className="form-group">
                                    <label>{t.baseUrl}</label>
                                    <input
                                        type="text"
                                        value={currentProviderData.options?.baseURL || ''}
                                        onChange={(e) => updateProviderOption('baseURL', e.target.value)}
                                    />
                                </div>
                            </section>

                            <section className="models-section">
                                <div className="section-header">
                                    <h3>{t.models}</h3>
                                    <button className="add-btn" onClick={addModel}>{t.addModel}</button>
                                </div>
                                <div className="model-grid">
                                    {currentProviderData.models && Object.entries(currentProviderData.models).map(([key, model]) => (
                                        <div key={key} className="model-card">
                                            <div className="model-header">
                                                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{model.name}</span>
                                                <button className="delete-btn" onClick={() => deleteModel(key)}>×</button>
                                            </div>
                                            <div className="model-body">
                                                <label>{t.modelKey}</label>
                                                <input
                                                    type="text"
                                                    defaultValue={key}
                                                    title="回车确认修改"
                                                    onBlur={(e) => renameModelKey(key, e.target.value.trim())}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.target.blur();
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div >
    );
}

export default App;

