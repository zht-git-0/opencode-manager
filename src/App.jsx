import React, { useState, useEffect } from 'react';

// Translations
const translations = {
    zh: {
        loading: '加载中...',
        error: '错误',
        invalidConfig: '配置无效',
        saved: '已保存',
        autoSaveFailed: '自动保存失败',
        addProvider: '添加供应商',
        deleteProvider: '删除供应商',
        confirmDelete: '确定要删除该供应商吗？',
        options: '选项',
        baseUrl: '基础 URL (Base URL)',
        providerName: '供应商名称',
        models: '模型列表',
        addModel: '+ 添加模型',
        modelKey: '模型标识 (完整名)',
        keyExists: '该模型标识已存在',
        newProvider: '新供应商',
        newModel: '新模型',
    },
    en: {
        loading: 'Loading...',
        error: 'Error',
        invalidConfig: 'Invalid Configuration',
        saved: 'Saved',
        autoSaveFailed: 'Auto-save failed',
        addProvider: 'Add Provider',
        deleteProvider: 'Delete Provider',
        confirmDelete: 'Are you sure you want to delete this provider?',
        options: 'Options',
        baseUrl: 'Base URL',
        providerName: 'Provider Name',
        models: 'Models',
        addModel: '+ Add Model',
        modelKey: 'Model Key (Full Name)',
        keyExists: 'This model key already exists',
        newProvider: 'New Provider',
        newModel: 'New Model',
    }
};

function App() {
    const [lang, setLang] = useState('zh');
    const t = translations[lang];
    const [config, setConfig] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    // Auto-save when config changes
    useEffect(() => {
        if (config && !loading) {
            const saveTimeout = setTimeout(async () => {
                try {
                    const result = await window.electronAPI.saveConfig(config);
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
            const result = await window.electronAPI.saveConfig(config);
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
                                        placeholder={t.providerName}
                                        style={{ fontSize: '1.8rem', fontWeight: 'bold', background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent-color)', color: 'var(--text-primary)', outline: 'none', padding: '4px 0' }}
                                    />
                                    <span className="badge">{currentProviderData.npm}</span>
                                </div>
                                <button className="delete-btn" onClick={deleteProvider} style={{ fontSize: '1rem', border: '1px solid currentColor', borderRadius: '4px', padding: '4px 8px' }} title={t.deleteProvider}>{t.deleteProvider}</button>
                            </header>

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

