import { StorageSection } from './converterClasses2Storage';
export declare const convertStorages2Dot: (storageSections: readonly StorageSection[], options: {
    data: boolean;
}) => string;
export declare function convertStorage2Dot(storageSection: StorageSection, dotString: string, options: {
    data: boolean;
}): string;
