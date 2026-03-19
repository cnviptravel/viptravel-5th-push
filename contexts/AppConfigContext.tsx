import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiGetAppConfig, apiUpdateAppConfig } from '../services/api';

export interface AppConfig {
    appName: string;
    logoUrl: string;          
    appNameImageUrl: string;  
    loginLogoUrl: string;     
    loginNameImageUrl: string;
}

interface AppConfigContextType {
    config: AppConfig;
    updateConfig: (newConfig: AppConfig) => Promise<void>;
    loading: boolean;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<AppConfig>({ 
        appName: 'CJ Travel', 
        logoUrl: '', 
        appNameImageUrl: '',
        loginLogoUrl: '',
        loginNameImageUrl: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await apiGetAppConfig();
            // ЗАСВАР: (data as AppConfig) гэж төрлийг нь зааж өгсөн
            setConfig(data as AppConfig);
        } catch (e) {
            console.error("Failed to load config");
        } finally {
            setLoading(false);
        }
    };

    const updateConfig = async (newData: AppConfig) => {
        const savedConfig = await apiUpdateAppConfig(newData);
        // ЗАСВАР: Энд бас төрлийг нь зааж өгч болно
        setConfig(savedConfig as AppConfig);
    };

    return (
        <AppConfigContext.Provider value={{ config, updateConfig, loading }}>
            {children}
        </AppConfigContext.Provider>
    );
};

export const useAppConfig = () => {
    const context = useContext(AppConfigContext);
    if (!context) throw new Error("useAppConfig must be used within AppConfigProvider");
    return context;
};