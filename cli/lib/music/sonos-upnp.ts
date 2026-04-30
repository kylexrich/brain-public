import { spawnSync } from "node:child_process";

export const APPLE_MUSIC_SID = 204;
export const APPLE_MUSIC_SN = 4;
export const APPLE_MUSIC_FLAGS = 8300;
export const APPLE_MUSIC_DESC = "SA_RINCON52231_X_#Svc52231-0-Token";

interface SonosDevice {
  name?: string;
  ip?: string;
  udn?: string;
}

export interface SonosGroupMember {
  name: string;
  ip: string;
  uuid: string;
}

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `Command failed: ${command} ${args.join(" ")}`);
  }
  return result.stdout ?? "";
}

function parseDiscoverPayload(payload: string): SonosDevice[] {
  const parsed = JSON.parse(payload) as unknown;
  if (Array.isArray(parsed)) {
    return parsed as SonosDevice[];
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { devices?: SonosDevice[] }).devices)) {
    return (parsed as { devices: SonosDevice[] }).devices;
  }
  return [];
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function discoverSpeakerByName(speakerName: string): Required<Pick<SonosDevice, "ip" | "udn" | "name">> {
  const devices = parseDiscoverPayload(run("sonos-pr3", ["discover", "--format", "json"]));
  const match = devices.find((device) => (device.name ?? "").toLowerCase() === speakerName.toLowerCase());

  if (!match?.ip) {
    throw new Error(`Speaker '${speakerName}' not found`);
  }
  if (!match.udn) {
    throw new Error(`Speaker '${speakerName}' is missing a UDN`);
  }

  return {
    ip: match.ip,
    udn: match.udn,
    name: match.name ?? speakerName
  };
}

function postSoapRequest(speakerIp: string, action: string, body: string): string {
  const result = spawnSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      `http://${speakerIp}:1400/MediaRenderer/AVTransport/Control`,
      "-H",
      "Content-Type: text/xml; charset=\"utf-8\"",
      "-H",
      `SOAPACTION: "urn:schemas-upnp-org:service:AVTransport:1#${action}"`,
      "-d",
      body
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `SOAP request failed: ${action}`);
  }

  return result.stdout ?? "";
}

function extractXmlTagValue(response: string, tagName: string): string | null {
  const match = response.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`));
  return match?.[1] ?? null;
}

export function queueContainerUri(options: {
  speakerIp: string;
  uri: string;
  metadata: string;
}): number {
  const escapedUri = xmlEscape(options.uri);
  const escapedMetadata = xmlEscape(options.metadata);
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:AddURIToQueue xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>0</InstanceID>
      <EnqueuedURI>${escapedUri}</EnqueuedURI>
      <EnqueuedURIMetaData>${escapedMetadata}</EnqueuedURIMetaData>
      <DesiredFirstTrackNumberEnqueued>0</DesiredFirstTrackNumberEnqueued>
      <EnqueueAsNext>0</EnqueueAsNext>
    </u:AddURIToQueue>
  </s:Body>
</s:Envelope>`;
  const response = postSoapRequest(options.speakerIp, "AddURIToQueue", soapBody);

  const errorCode = extractXmlTagValue(response, "errorCode");
  if (errorCode) {
    throw new Error(`UPnP error ${errorCode}`);
  }

  return Number(extractXmlTagValue(response, "NumTracksAdded") ?? "0");
}

export function setTransportToQueue(speakerIp: string, speakerUdn: string): void {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>0</InstanceID>
      <CurrentURI>x-rincon-queue:${speakerUdn}#0</CurrentURI>
      <CurrentURIMetaData></CurrentURIMetaData>
    </u:SetAVTransportURI>
  </s:Body>
</s:Envelope>`;
  postSoapRequest(speakerIp, "SetAVTransportURI", soapBody);
}

function postRenderingControlSoapRequest(speakerIp: string, action: string, body: string): string {
  const result = spawnSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      `http://${speakerIp}:1400/MediaRenderer/RenderingControl/Control`,
      "-H",
      "Content-Type: text/xml; charset=\"utf-8\"",
      "-H",
      `SOAPACTION: "urn:schemas-upnp-org:service:RenderingControl:1#${action}"`,
      "-d",
      body,
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `RenderingControl SOAP request failed: ${action}`);
  }

  return result.stdout ?? "";
}

export function setVolumeAbsolute(speakerIp: string, volumeLevel: number): void {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:SetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>${volumeLevel}</DesiredVolume></u:SetVolume></s:Body></s:Envelope>`;
  const response = postRenderingControlSoapRequest(speakerIp, "SetVolume", soapBody);
  const errorCode = extractXmlTagValue(response, "errorCode");
  if (errorCode) {
    throw new Error(`UPnP RenderingControl error ${errorCode} on ${speakerIp}`);
  }
}

export function getGroupMembers(memberName: string): SonosGroupMember[] {
  const groupStatusJson = run("sonos-pr3", ["group", "status", "--format", "json"]);
  const parsed = JSON.parse(groupStatusJson) as { groups?: Array<{ members?: SonosGroupMember[] }> };
  const groups = parsed.groups ?? [];

  const targetGroup = groups.find((g) =>
    (g.members ?? []).some((m) => m.name.toLowerCase() === memberName.toLowerCase())
  );

  if (!targetGroup) {
    throw new Error(`No group found containing speaker '${memberName}'`);
  }

  return targetGroup.members ?? [];
}

export function buildDidlMetadata(options: {
  itemId: string;
  title: string;
  upnpClass: string;
}): string {
  return `<DIDL-Lite xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/" xmlns:r="urn:schemas-rinconnetworks-com:metadata-1-0/" xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/"><item id="${options.itemId}" parentID="${options.itemId}" restricted="true"><dc:title>${xmlEscape(options.title)}</dc:title><upnp:class>${options.upnpClass}</upnp:class><desc id="cdudn" nameSpace="urn:schemas-rinconnetworks-com:metadata-1-0/">${APPLE_MUSIC_DESC}</desc></item></DIDL-Lite>`;
}
