import type { NextConfig } from "next";
const config:NextConfig={poweredByHeader:false,reactStrictMode:false,async headers(){return [{source:"/:path*",headers:[{key:"X-Robots-Tag",value:"noindex, nofollow"},{key:"Referrer-Policy",value:"no-referrer"},{key:"X-Content-Type-Options",value:"nosniff"}]}]}};
export default config;
