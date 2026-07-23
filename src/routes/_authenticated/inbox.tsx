import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLeads, getLead, sendCustomWhatsAppMessage } from "@/lib/leads.functions";
import { supabase } from "@/integrations/supabase/client";
import { WaStatusPill } from "@/components/app/StatusPills";
import { toast } from "sonner";
import {
  Check,
  CheckCheck,
  XCircle,
  Send,
  Search,
  MessageSquare,
  Phone,
  Building2,
  MapPin,
  ChevronRight,
  Wifi,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/inbox")({
  head: () => ({ meta: [{ title: "Inbox — Pulse CRM" }] }),
  component: InboxPage,
});

/* ─── helpers ──────────────────────────────────────────────── */
function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3_600_000;
  if (diffH < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffH < 48) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const WA_GREEN = "#25D366";
const WA_DARK = "#075E54";
const WA_TEAL = "#128C7E";
const WA_BUBBLE_OUT = "#DCF8C6";
const WA_BUBBLE_IN = "#FFFFFF";
const WA_BG = "#ECE5DD";
const WA_SIDEBAR = "#FFFFFF";

/* ─── page ─────────────────────────────────────────────────── */
function InboxPage() {
  const navigate = useNavigate();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const listLeadsFn = useServerFn(listLeads);
  const { data: leadsData, refetch: refetchLeads } = useQuery({
    queryKey: ["leads-inbox"],
    queryFn: () => listLeadsFn({ data: {} }),
  });

  // Real-time updates for leads list
  useEffect(() => {
    const ch = supabase
      .channel("inbox-leads-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        refetchLeads();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        refetchLeads();
        if (selectedLeadId) qc.invalidateQueries({ queryKey: ["lead", selectedLeadId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedLeadId, refetchLeads, qc]);

  const allLeads = leadsData?.leads ?? [];
  const filtered = allLeads.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.mobile.includes(q) ||
      (l.business_name ?? "").toLowerCase().includes(q)
    );
  });

  // Sort: leads with recent activity first, then by name
  const sorted = [...filtered].sort((a, b) => {
    const aT = new Date(a.last_activity_at ?? a.created_at).getTime();
    const bT = new Date(b.last_activity_at ?? b.created_at).getTime();
    return bT - aT;
  });

  return (
    <div
      style={{ height: "calc(100vh - 3.5rem)", display: "flex", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 32px rgba(0,0,0,0.12)" }}
    >
      {/* ─── LEFT: Leads list ─────────────────── */}
      <div
        style={{
          width: 340,
          minWidth: 260,
          display: "flex",
          flexDirection: "column",
          background: WA_SIDEBAR,
          borderRight: "1px solid #e0e0e0",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: WA_DARK,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: WA_GREEN,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <MessageSquare size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Inbox</div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
              {allLeads.length} conversations
            </div>
          </div>
          <Wifi size={16} color="rgba(255,255,255,0.5)" />
        </div>

        {/* Search */}
        <div style={{ padding: "8px 10px", background: "#f0f2f5" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#fff",
              borderRadius: 8,
              padding: "6px 10px",
              gap: 8,
              border: "1px solid #e0e0e0",
            }}
          >
            <Search size={14} color="#667781" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              style={{
                border: "none",
                outline: "none",
                flex: 1,
                fontSize: 13,
                background: "transparent",
                color: "#111",
              }}
            />
          </div>
        </div>

        {/* Lead list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {sorted.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "#667781", fontSize: 13 }}>
              No leads found
            </div>
          )}
          {sorted.map((lead) => {
            const isSelected = selectedLeadId === lead.id;
            const initials = avatarInitials(lead.name);
            const hasInbound = (lead as any).wa_status === "replied";
            return (
              <button
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  background: isSelected ? "#f0f2f5" : "transparent",
                  border: "none",
                  borderBottom: "1px solid #f0f2f5",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: `hsl(${(lead.name.charCodeAt(0) * 17) % 360}, 55%, 48%)`,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {initials}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.name}
                    </span>
                    <span style={{ fontSize: 11, color: "#667781", flexShrink: 0 }}>
                      {timeLabel(lead.last_activity_at ?? lead.created_at)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: "#667781", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {lead.mobile}
                      {lead.business_name ? ` · ${lead.business_name}` : ""}
                    </span>
                    <WaStatusBadge status={lead.wa_status as string} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT: Chat panel ────────────────── */}
      {selectedLeadId ? (
        <ChatPanel
          leadId={selectedLeadId}
          onOpenLead={() => navigate({ to: "/leads/$leadId", params: { leadId: selectedLeadId } })}
        />
      ) : (
        <div
          style={{
            flex: 1,
            background: WA_BG,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: WA_DARK,
              display: "grid",
              placeItems: "center",
            }}
          >
            <MessageSquare size={36} color="#fff" />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: WA_DARK }}>Pulse Inbox</div>
            <div style={{ fontSize: 13, color: "#667781", marginTop: 6, maxWidth: 280 }}>
              Select a lead from the list to start chatting. Messages sync in real-time.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Chat panel ────────────────────────────────────────────── */
function ChatPanel({ leadId, onOpenLead }: { leadId: string; onOpenLead: () => void }) {
  const qc = useQueryClient();
  const getLeadFn = useServerFn(getLead);
  const sendMsgFn = useServerFn(sendCustomWhatsAppMessage);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getLeadFn({ data: { id: leadId } }),
    retry: false,
  });

  // Scroll to bottom on new messages
  const messages = data?.messages ?? [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-focus input when lead changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [leadId]);

  // Real-time for this lead
  useEffect(() => {
    const ch = supabase
      .channel(`chat-${leadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `lead_id=eq.${leadId}` }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "leads", filter: `id=eq.${leadId}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [leadId, refetch]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !data?.lead) return;

    const text = newMessage.trim();
    setNewMessage("");

    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    qc.setQueryData(["lead", leadId], (old: any) =>
      old ? { ...old, messages: [...old.messages, {
        id: tempId, lead_id: leadId, direction: "outbound",
        phone: data.lead.mobile, body: text, status: "sending",
        created_at: new Date().toISOString(), wa_message_id: null,
        sent_at: null, delivered_at: null, read_at: null,
        replied_at: null, failed_at: null, error: null,
        api_response: null, retry_count: 0,
        updated_at: new Date().toISOString(),
        template_name: null,
      }] } : old
    );

    try {
      setIsSending(true);
      await sendMsgFn({ data: { lead_id: leadId, body: text } });
      toast.success("Message sent");
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["leads-inbox"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
      qc.setQueryData(["lead", leadId], (old: any) =>
        old ? { ...old, messages: old.messages.map((m: any) =>
          m.id === tempId ? { ...m, status: "failed", error: err.message } : m
        ) } : old
      );
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  }

  const lead = data?.lead;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: WA_BG, minWidth: 0 }}>

      {/* Chat header */}
      <div
        style={{
          background: WA_DARK,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: lead ? `hsl(${(lead.name.charCodeAt(0) * 17) % 360}, 55%, 48%)` : WA_TEAL,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {lead ? avatarInitials(lead.name) : "?"}
        </div>

        {/* Name + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead?.name ?? "Loading…"}
          </div>
          <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
            <Phone size={10} />
            {lead?.mobile ?? ""}
            {lead?.city ? ` · ${lead.city}` : ""}
          </div>
        </div>

        {/* Open full lead */}
        <button
          onClick={onOpenLead}
          title="Open lead details"
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "none",
            borderRadius: 8,
            padding: "6px 12px",
            color: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          View lead <ChevronRight size={13} />
        </button>
      </div>

      {/* Lead info bar */}
      {lead && (
        <div
          style={{
            background: "rgba(255,255,255,0.85)",
            borderBottom: "1px solid #e0e0e0",
            padding: "6px 16px",
            display: "flex",
            gap: 20,
            fontSize: 11,
            color: "#667781",
            flexShrink: 0,
            backdropFilter: "blur(8px)",
          }}
        >
          {lead.business_name && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Building2 size={11} /> {lead.business_name}
            </span>
          )}
          {lead.city && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} /> {lead.city}
            </span>
          )}
          <span>
            Status: <strong style={{ color: "#111" }}>{lead.status}</strong>
          </span>
          <span style={{ marginLeft: "auto" }}>
            <WaStatusPill status={lead.wa_status as any} />
          </span>
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23ECE5DD'/%3E%3Cpath d='M0 0h60M0 30h60M0 60h60M0 0v60M30 0v60M60 0v60' stroke='%23D5CEC7' stroke-width='0.5'/%3E%3C/svg%3E\")",
        }}
      >
        {messages.length === 0 && !data && (
          <div style={{ textAlign: "center", marginTop: 60, color: "#667781", fontSize: 13 }}>
            Loading conversation…
          </div>
        )}
        {messages.length === 0 && data && (
          <div
            style={{
              alignSelf: "center",
              background: "rgba(255,255,255,0.85)",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 12,
              color: "#667781",
              marginTop: 20,
            }}
          >
            No messages yet. Send the first message below!
          </div>
        )}

        {messages.map((m, i) => {
          const isOut = m.direction === "outbound";
          const prevMsg = messages[i - 1];
          const showDate =
            i === 0 ||
            new Date(m.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();
          const isTemp = m.id.startsWith("temp-");

          return (
            <div key={m.id}>
              {/* Date separator */}
              {showDate && (
                <div style={{ textAlign: "center", margin: "8px 0" }}>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.85)",
                      borderRadius: 8,
                      padding: "3px 10px",
                      fontSize: 11,
                      color: "#667781",
                    }}
                  >
                    {new Date(m.created_at).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                </div>
              )}

              {/* Bubble */}
              <div
                style={{
                  display: "flex",
                  justifyContent: isOut ? "flex-end" : "flex-start",
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    maxWidth: "65%",
                    background: isOut ? WA_BUBBLE_OUT : WA_BUBBLE_IN,
                    borderRadius: isOut ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                    padding: "7px 10px 6px 10px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.13)",
                    position: "relative",
                    opacity: isTemp ? 0.75 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {/* Template label */}
                  {m.template_name && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#667781",
                        marginBottom: 4,
                        fontStyle: "italic",
                      }}
                    >
                      Template: {m.template_name}
                    </div>
                  )}

                  {/* Body */}
                  <div style={{ fontSize: 13.5, color: "#111", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.45 }}>
                    {m.body || (m.template_name ? `[${m.template_name}]` : "...")}
                  </div>

                  {/* Time + tick */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 3,
                      marginTop: 3,
                    }}
                  >
                    <span style={{ fontSize: 10, color: "#667781" }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isOut && (
                      <>
                        {(m.status === "sending" || isTemp) && (
                          <Check size={12} color="#667781" />
                        )}
                        {m.status === "sent" && <Check size={12} color="#667781" />}
                        {m.status === "delivered" && <CheckCheck size={12} color="#667781" />}
                        {m.status === "read" && <CheckCheck size={12} color={WA_TEAL} />}
                        {m.status === "replied" && <CheckCheck size={12} color={WA_GREEN} />}
                        {m.status === "failed" && <XCircle size={12} color="#e53935" />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        style={{
          background: "#f0f2f5",
          borderTop: "1px solid #e0e0e0",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          disabled={isSending}
          style={{
            flex: 1,
            borderRadius: 24,
            border: "none",
            padding: "10px 18px",
            fontSize: 13.5,
            outline: "none",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            color: "#111",
          }}
        />
        <button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: newMessage.trim() ? WA_TEAL : "#B0BEC5",
            border: "none",
            cursor: newMessage.trim() ? "pointer" : "not-allowed",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          <Send size={18} color="#fff" style={{ marginLeft: 2 }} />
        </button>
      </form>
    </div>
  );
}

/* ─── Small WA status badge ─────────────────────────────────── */
function WaStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    sent: { color: "#667781", label: "Sent" },
    delivered: { color: "#667781", label: "Delivered" },
    read: { color: "#53bdeb", label: "Read" },
    replied: { color: "#25D366", label: "Replied" },
    failed: { color: "#e53935", label: "Failed" },
    pending: { color: "#FFA726", label: "Pending" },
    sending: { color: "#90A4AE", label: "Sending" },
  };
  const s = map[status] ?? { color: "#90A4AE", label: status };
  return (
    <span
      style={{
        fontSize: 10,
        color: s.color,
        fontWeight: 600,
        flexShrink: 0,
        marginLeft: 6,
      }}
    >
      {s.label}
    </span>
  );
}
