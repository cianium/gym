import {createDemoFetch} from "./demoRuntime";
import fixtures from "../data/previewFixtures.json";
let client:ReturnType<typeof createDemoFetch>|undefined;
export const demoFetch:typeof fetch = async(input,init)=>{if(typeof window==="undefined")throw new Error("Browser preview only");client??=createDemoFetch(fixtures);return client(input instanceof URL?input.href:input,init);};
