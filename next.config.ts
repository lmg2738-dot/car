import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/aihub/*": ["./bin/aihubshell"],
  },
};

export default nextConfig;
