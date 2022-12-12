export type OutputFormats = 'svg' | 'png' | 'dot' | 'all';
export declare const writeOutputFiles: (dot: string, fileFolderAddress: string, contractName: string, outputFormat?: OutputFormats, outputFilename?: string) => Promise<void>;
export declare function convertDot2Svg(dot: string): any;
export declare function writeSolidity(code: string, filename?: string): void;
export declare function writeDot(dot: string, filename: string): void;
export declare function writeSVG(svg: any, svgFilename?: string, outputFormats?: OutputFormats): Promise<void>;
export declare function writePng(svg: any, filename: string): Promise<void>;
