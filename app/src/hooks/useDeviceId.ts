import { useState, useEffect } from 'react';

export const useDeviceId = () => {
    const [deviceId, setDeviceId] = useState<string | null>(null);

    useEffect(() => {
        let id = localStorage.getItem('deviceId');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('deviceId', id);
        }
        setDeviceId(id);
    }, []);

    return deviceId;
};
