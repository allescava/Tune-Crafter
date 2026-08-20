import React, { useEffect, useState } from "react";

interface KeyDef {
    key: string;
    label: string;
}

const DRUM_KEYS: KeyDef[] = [
    { key: "N", label: "Kick" },
    { key: "B", label: "Snare" },
    { key: "V", label: "Hat" },
    { key: "C", label: "Clap" },
];

const CHORD_KEYS: KeyDef[] = [
    { key: "S", label: "Do" },
    { key: "D", label: "Re" },
    { key: "F", label: "Mi" },
    { key: "G", label: "Fa" },
    { key: "H", label: "Sol" },
    { key: "J", label: "La" },
    { key: "K", label: "Si" },
    { key: "L", label: "Do+" },
];

const SHARP_KEYS: KeyDef[] = [
    { key: "W", label: "Do#" },
    { key: "E", label: "Re#" },
    { key: "R", label: "Fa#" },
    { key: "T", label: "Sol#" },
    { key: "Y", label: "La#" },
    { key: "U", label: "Do#+" },
    { key: "I", label: "Re#+" },
    { key: "O", label: "Fa#+" },
    { key: "P", label: "Sol#+" },
    { key: "[", label: "La#+" },
];

// A single "physical" key cap, styled like a keyboard key
const Key: React.FC<{ label: string; active?: boolean }> = ({ label, active = false }) => (
    <kbd
        style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "34px",
            height: "34px",
            padding: "0 8px",
            borderRadius: "6px",
            background: active ? "linear-gradient(180deg, #79e6ff, #1789b0)" : "linear-gradient(180deg, #3a3a3a, #202020)",
            border: "1px solid #4a4a4a",
            borderBottom: active ? "3px solid #0d5870" : "3px solid #111",
            color: active ? "#07151b" : "#f5f5ff",
            fontFamily: "monospace",
            fontSize: "14px",
            fontWeight: 600,
            boxShadow: active ? "0 0 14px #63e6ff, 0 2px 0 #0d5870" : "0 2px 0 rgba(0,0,0,0.4)",
        }}
    >
        {label}
    </kbd>
);

const KeyboardRow: React.FC<{ keys: KeyDef[]; activeKeys: Set<string>; offset?: number }> = ({ keys, activeKeys, offset = 0 }) => (
    <div style={{ display: "flex", gap: "6px", marginLeft: `${offset}px` }}>
        {keys.map(({ key, label }) => (
            <div key={key} style={{ width: "42px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <Key label={key} active={activeKeys.has(key.toLowerCase())} />
                <span style={{ color: "white", fontSize: "9px", whiteSpace: "nowrap" }}>{label}</span>
            </div>
        ))}
    </div>
);

const KeyboardLegend: React.FC = () => {
    const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.repeat) return;
            setActiveKeys((current) => new Set(current).add(event.key.toLowerCase()));
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            setActiveKeys((current) => {
                const next = new Set(current);
                next.delete(event.key.toLowerCase());
                return next;
            });
        };
        const clearKeys = () => setActiveKeys(new Set());
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", clearKeys);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", clearKeys);
        };
    }, []);

    return <div
        style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "7px",
            padding: "16px",
            marginTop: "10px",
        }}
    >
        <p style={{ color: "#f5f5ff85", fontSize: "11px", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "1px" }}>Keyboard controls</p>
        <KeyboardRow keys={SHARP_KEYS} activeKeys={activeKeys} />
        <KeyboardRow keys={CHORD_KEYS} activeKeys={activeKeys} offset={18} />
        <div style={{ display: "flex", gap: "6px", marginLeft: "60px", alignItems: "flex-start" }}>
            <KeyboardRow keys={DRUM_KEYS} activeKeys={activeKeys} />
            <div style={{ width: "90px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <Key label="Enter" active={activeKeys.has("enter")} />
                <span style={{ color: "white", fontSize: "9px", whiteSpace: "nowrap" }}>Record / stop</span>
            </div>
        </div>
    </div>
};

export default KeyboardLegend;
