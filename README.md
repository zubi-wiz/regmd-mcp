# regmd-mcp

MCP server for **[regMD](https://regmd.dev)** — Global Medical Device Regulatory Intelligence.

Classify devices, query regulatory alerts, and find market expansion pathways across 15 jurisdictions — all from your AI assistant.

## Install

```bash
npx regmd-mcp
```

Or install globally:

```bash
npm install -g regmd-mcp
regmd-mcp
```

## Configure

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "regmd": {
      "command": "npx",
      "args": ["-y", "regmd-mcp"],
      "env": {
        "REGMD_API_KEY": "your_api_key"
      }
    }
  }
}
```

### OpenClaw

Add to your OpenClaw MCP config:

```json
{
  "mcpServers": {
    "regmd": {
      "command": "npx",
      "args": ["-y", "regmd-mcp"],
      "env": {
        "REGMD_API_KEY": "your_api_key"
      }
    }
  }
}
```

### Cursor / Windsurf / Any MCP Client

```json
{
  "mcpServers": {
    "regmd": {
      "command": "npx",
      "args": ["-y", "regmd-mcp"],
      "env": {
        "REGMD_API_KEY": "your_api_key"
      }
    }
  }
}
```

## Tools

### `classify_device`

Classify a medical device across global regulatory jurisdictions.

**Example:** "Classify a wireless blood pressure monitor for FDA and EU MDR"

**Parameters:**
- `deviceName` (required) — Device name
- `deviceDescription` (required) — Description of the device
- `intendedPurpose` (required) — Clinical intended use
- `targetMarkets` (required) — Array of jurisdiction codes: `US`, `EU`, `SG`, `AU`, `JP`, `CN`, `CA`, `KR`, `IN`, `BR`, `TH`, `MY`, `VN`, `PH`, `HK`
- `deviceCategory` — `general`, `samd`, `implant`, `ivd`, `active`, `non_active`, `in_vitro`
- `contactType` — `non-invasive`, `invasive-orifice`, `surgically-invasive`, `implantable`, `no-contact`
- `durationOfUse` — `transient` (<60min), `short-term` (<30 days), `long-term` (>30 days)
- `isActive` — Electrically powered (boolean)
- `hasSoftware` — Contains software (boolean)

### `list_jurisdictions`

List all 15 supported regulatory jurisdictions with agency names and details.

### `get_alerts`

Query recent regulatory alerts from FDA, EU-MDCG, and HSA.

**Example:** "Show me critical FDA alerts from the last 7 days"

**Parameters:**
- `jurisdiction` — `fda`, `eu-mdr`, `hsa`, or `all`
- `urgency` — `critical`, `plan`, `awareness`, or `all`
- `limit` — 1-50 (default: 10)
- `days` — Last N days (1-90, default: 30)

### `find_pathway`

Find regulatory pathway between jurisdictions.

**Example:** "What's the pathway from FDA clearance to EU MDR for a Class II device?"

**Parameters:**
- `fromJurisdiction` (required) — Source jurisdiction code
- `toJurisdiction` (required) — Target jurisdiction code
- `deviceCategory` — Device category
- `riskClass` — Risk class in source jurisdiction

## Coverage

🇺🇸 FDA · 🇪🇺 EU MDR · 🇸🇬 HSA · 🇦🇺 TGA · 🇯🇵 PMDA · 🇨🇳 NMPA · 🇨🇦 Health Canada · 🇰🇷 MFDS · 🇮🇳 CDSCO · 🇧🇷 ANVISA · 🇹🇭 Thai FDA · 🇲🇾 MDA · 🇻🇳 VMOH · 🇵🇭 FDA-PH · 🇭🇰 MDCO

## API

The MCP server connects to the regMD REST API at `https://regmd.dev/api/v1`.

- **Free:** Device classification (basic)
- **$99 Lifetime Deal:** Full access — classification, portfolio, alerts, pathways, timeline, compliance

Get your API key at [regmd.dev](https://regmd.dev).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `REGMD_API_URL` | `https://regmd.dev` | API base URL |
| `REGMD_API_KEY` | — | API key for authenticated endpoints |

## License

MIT
