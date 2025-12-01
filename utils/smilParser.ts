
import { SmilPar } from "../types";

export const parseSmil = (doc: Document, basePath: string): SmilPar[] => {
    const pars = Array.from(doc.querySelectorAll('par'));
    return pars.map(par => {
        const textTag = par.querySelector('text');
        const audioTag = par.querySelector('audio');
        
        const textSrc = textTag?.getAttribute('src') || "";
        const audioSrc = audioTag?.getAttribute('src') || "";
        
        // Handle 'clipBegin' / 'clipEnd'
        const beginStr = audioTag?.getAttribute('clipBegin') || audioTag?.getAttribute('clip-begin');
        const endStr = audioTag?.getAttribute('clipEnd') || audioTag?.getAttribute('clip-end');

        // Resolve element ID (chapter.xhtml#p1 -> p1)
        const elementId = textSrc.split('#')[1] || "";
        
        // Resolve audio path relative to SMIL file location
        const resolvedAudioSrc = resolvePath(basePath, audioSrc);
        const resolvedTextSrc = resolvePath(basePath, textSrc);

        return {
            textSrc: resolvedTextSrc,
            elementId,
            audioSrc: resolvedAudioSrc,
            begin: parseTime(beginStr),
            end: parseTime(endStr)
        };
    }).filter(p => p.elementId && p.audioSrc);
};

export const resolvePath = (base: string, relative: string) => {
    if (!relative) return "";
    if (relative.startsWith("/")) return relative.substring(1); // Remove leading slash for consistency

    // Base usually looks like "OEBPS/text/chapter1.smil"
    // We want the directory: "OEBPS/text/"
    const stack = base.split("/");
    stack.pop(); // Remove current file name
    
    const parts = relative.split("/");
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === ".") continue;
        if (parts[i] === "..") {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(parts[i]);
        }
    }
    return stack.join("/");
};

const parseTime = (timeStr: string | null | undefined): number => {
    if(!timeStr) return 0;
    // Format: 12.34s, 00:00:12.34
    if (timeStr.includes(':')) {
        const parts = timeStr.split(':').map(parseFloat);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return parseFloat(timeStr);
    }
    const val = parseFloat(timeStr.replace('s', ''));
    return isNaN(val) ? 0 : val;
};
