#!/usr/bin/env npx tsx
/**
 * regMD MCP Server
 * 
 * Makes regMD's regulatory intelligence agent-readable via the
 * Model Context Protocol. Any MCP-compatible client (Claude, OpenClaw,
 * Cursor, etc.) can discover, classify, and query regulatory data.
 * 
 * Tools:
 *   - classify_device: Classify a medical device across jurisdictions
 *   - list_jurisdictions: List all supported jurisdictions
 *   - get_alerts: Query recent regulatory alerts
 *   - find_pathway: Find market expansion pathway between jurisdictions
 *   - get_portfolio: List devices in a user's portfolio
 * 
 * Usage:
 *   REGMD_API_URL=https://regmd.dev REGMD_API_KEY=<key> npx tsx mcp/regmd-mcp-server.ts
 * 
 * Or add to MCP config:
 *   {
 *     "mcpServers": {
 *       "regmd": {
 *         "command": "npx",
 *         "args": ["tsx", "/path/to/mcp/regmd-mcp-server.ts"],
 *         "env": { "REGMD_API_URL": "https://regmd.dev", "REGMD_API_KEY": "<key>" }
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = process.env.REGMD_API_URL || 'https://regmd.dev';
const API_KEY = process.env.REGMD_API_KEY || '';

// ─── Helpers ─────────────────────────────────────────────────────

async function apiCall(path: string, options: RequestInit = {}): Promise<unknown> {
  const url = `${API_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'regMD-MCP-Server/1.0',
  };
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...((options.headers as Record<string, string>) || {}) },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`regMD API error: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
  }

  return res.json();
}

// ─── Server ──────────────────────────────────────────────────────

const server = new McpServer({
  name: 'regmd',
  version: '1.0.0',
});

// ─── Tool: classify_device ───────────────────────────────────────

server.tool(
  'classify_device',
  `Classify a medical device across global regulatory jurisdictions.
Returns risk classification, regulatory pathway, estimated timeline, and costs for each target market.
Supports 15 jurisdictions: US (FDA), EU (MDR), SG (HSA), AU (TGA), JP (PMDA), CN (NMPA), CA (Health Canada), KR (MFDS), IN (CDSCO), BR (ANVISA), TH (Thai FDA), MY (MDA), VN (VMOH), PH (FDA Philippines), HK (MDCO).
Use ISO country codes or agency abbreviations for targetMarkets.`,
  {
    deviceName: z.string().describe('Name of the medical device (e.g., "Wireless Blood Pressure Monitor")'),
    deviceDescription: z.string().describe('Description of the device, its technology, and key features'),
    intendedPurpose: z.string().describe('Clinical intended use/purpose of the device'),
    targetMarkets: z.array(z.string()).describe('Target jurisdictions as ISO codes (US, EU, SG, AU, JP, CN, CA, KR, IN, BR, TH, MY, VN, PH, HK) or agency names (FDA, TGA, HSA, PMDA, NMPA, MFDS, CDSCO, ANVISA)'),
    deviceCategory: z.enum([
      'general', 'samd', 'implant', 'ivd', 'active', 'non_active', 'in_vitro',
    ]).optional().describe('Device category. Default: "general". Use "samd" for software-as-medical-device, "ivd" for in-vitro diagnostics, "implant" for implantable devices.'),
    contactType: z.enum([
      'non-invasive', 'invasive-orifice', 'surgically-invasive', 'implantable', 'no-contact',
    ]).optional().describe('Patient contact type. Default: "non-invasive"'),
    durationOfUse: z.enum([
      'transient', 'short-term', 'long-term',
    ]).optional().describe('Duration of use. transient=<60min, short-term=<30days, long-term=>30days. Default: "transient"'),
    isActive: z.boolean().optional().describe('Whether the device is electrically powered. Default: false'),
    hasSoftware: z.boolean().optional().describe('Whether the device contains/is software. Default: false'),
  },
  async (params) => {
    try {
      const body = {
        deviceName: params.deviceName,
        deviceDescription: params.deviceDescription,
        intendedPurpose: params.intendedPurpose,
        targetMarkets: params.targetMarkets,
        deviceCategory: params.deviceCategory || 'general',
        contactType: params.contactType || 'non-invasive',
        durationOfUse: params.durationOfUse || 'transient',
        isActive: params.isActive || false,
        hasSoftware: params.hasSoftware || false,
      };

      const result = await apiCall('/api/v1/classify', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error classifying device: ${message}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: list_jurisdictions ────────────────────────────────────

server.tool(
  'list_jurisdictions',
  `List all supported regulatory jurisdictions with details.
Returns jurisdiction codes, full names, regulatory agencies, and supported features.`,
  {},
  async () => {
    try {
      const result = await apiCall('/api/v1/jurisdictions');
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error fetching jurisdictions: ${message}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: get_alerts ────────────────────────────────────────────

server.tool(
  'get_alerts',
  `Query recent regulatory alerts from FDA, EU-MDCG, and HSA.
Returns AI-analyzed alerts with urgency levels, affected device types, risk classes, action items, and source URLs.
Alerts are scraped daily from official regulatory agency websites.`,
  {
    jurisdiction: z.enum(['fda', 'eu-mdr', 'hsa', 'all']).optional()
      .describe('Filter by jurisdiction. Default: "all"'),
    urgency: z.enum(['critical', 'plan', 'awareness', 'all']).optional()
      .describe('Filter by urgency level. critical=immediate action, plan=action within 1-6 months, awareness=informational. Default: "all"'),
    limit: z.number().min(1).max(50).optional()
      .describe('Maximum number of alerts to return. Default: 10'),
    days: z.number().min(1).max(90).optional()
      .describe('Only return alerts from the last N days. Default: 30'),
  },
  async (params) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.jurisdiction && params.jurisdiction !== 'all') {
        queryParams.set('jurisdiction', params.jurisdiction);
      }
      if (params.urgency && params.urgency !== 'all') {
        queryParams.set('urgency', params.urgency);
      }
      queryParams.set('limit', String(params.limit || 10));
      if (params.days) {
        queryParams.set('days', String(params.days));
      }

      const qs = queryParams.toString();
      const result = await apiCall(`/api/v1/alerts${qs ? `?${qs}` : ''}`);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error fetching alerts: ${message}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: find_pathway ──────────────────────────────────────────

server.tool(
  'find_pathway',
  `Find the regulatory pathway between two jurisdictions for a specific device type.
Returns requirements, estimated timeline, costs, recognition agreements, and expansion recommendations.
Useful for planning market expansion: "I have FDA clearance, what do I need for EU MDR?"`,
  {
    fromJurisdiction: z.string().describe('Source jurisdiction code (e.g., "US", "SG", "EU")'),
    toJurisdiction: z.string().describe('Target jurisdiction code (e.g., "EU", "AU", "JP")'),
    deviceCategory: z.enum([
      'general', 'samd', 'implant', 'ivd',
    ]).optional().describe('Device category for pathway-specific requirements. Default: "general"'),
    riskClass: z.string().optional().describe('Risk class in source jurisdiction (e.g., "II", "III", "Class IIa")'),
  },
  async (params) => {
    try {
      const queryParams = new URLSearchParams({
        from: params.fromJurisdiction,
        to: params.toJurisdiction,
      });
      if (params.deviceCategory) queryParams.set('category', params.deviceCategory);
      if (params.riskClass) queryParams.set('riskClass', params.riskClass);

      const result = await apiCall(`/api/v1/jurisdictions/pathway?${queryParams}`);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        content: [{ type: 'text' as const, text: `Error finding pathway: ${message}` }],
        isError: true,
      };
    }
  }
);

// ─── Resource: Product Info ──────────────────────────────────────

server.resource(
  'product-info',
  'regmd://product-info',
  async () => ({
    contents: [{
      uri: 'regmd://product-info',
      mimeType: 'text/plain',
      text: `regMD — Global Medical Device Regulatory Intelligence Platform

What it does:
- Classify medical devices across 15 jurisdictions instantly (rule-based, deterministic)
- AI-powered regulatory alerts from FDA, EU-MDCG, HSA (daily monitoring)
- Device portfolio management with regulatory stage tracking
- Market expansion pathway finder with AI recommendations
- Regulatory timeline and milestone tracking
- Compliance obligation management (PSUR, PMS, vigilance, renewals)

Pricing:
- Free: Device classification + pathway name only
- $99 Lifetime Deal: Full access to all features (one-time payment)

Coverage: US (FDA), EU (MDR), Singapore (HSA), Australia (TGA), Japan (PMDA), China (NMPA), Canada (Health Canada), Korea (MFDS), India (CDSCO), Brazil (ANVISA), Thailand (TFDA), Malaysia (MDA), Vietnam (VMOH), Philippines (FDA-PH), Hong Kong (MDCO)

API: REST API at https://regmd.dev/api/v1 (Bearer token auth, 60 req/hr)
Website: https://regmd.dev`,
    }],
  })
);

// ─── Start ───────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('regMD MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
