import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getLead,
  updateLead,
  resendWhatsApp,
  deleteLead,
  sendCustomWhatsAppMessage,
} from "@/lib/leads.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WaStatusPill, statusColor } from "@/components/app/StatusPills";
import {
  ArrowLeft,
  Send,
  MapPin,
  Mail,
  Phone,
  Building2,
  MessageCircle,
  CheckCheck,
  Check,
  Clock,
  XCircle,
  UserPlus,
  Activity,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({ meta: [{ title: "Lead — Pulse CRM" }] }),
  component: LeadDetail,
});

const eventIcon: Record<string, typeof Check> = {
  queued: Clock,
  sending: Send,
  sent: Send,
  delivered: Check,
  read: CheckCheck,
  replied: MessageCircle,
  failed: XCircle,
  assigned: UserPlus,
  status_change: Activity,
  note: Activity,
};

function LeadDetail() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getLead);
  const updateFn = useServerFn(updateLead);
  const resendFn = useServerFn(resendWhatsApp);
  const deleteFn = useServerFn(deleteLead);
  const [isDeleting, setIsDeleting] = useState(false);
  const sendMsgFn = useServerFn(sendCustomWhatsAppMessage);
  const [newMessage, setNewMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const { data, error, isError, refetch } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getFn({ data: { id: leadId } }),
    retry: false,
  });

  const scrollMessagesList = data?.messages ?? [];
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [scrollMessagesList.length]);

  useEffect(() => {
    const ch = supabase
      .channel(`lead-${leadId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads", filter: `id=eq.${leadId}` },
        () => {
          if (!isDeleting) refetch();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `lead_id=eq.${leadId}` },
        () => {
          if (!isDeleting) refetch();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_events", filter: `lead_id=eq.${leadId}` },
        () => {
          if (!isDeleting) refetch();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [isDeleting, leadId, refetch]);

  if (isError) {
    return (
      <Card className="p-6 text-center shadow-card">
        <h1 className="font-display text-xl font-semibold">Lead unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as any)?.message ?? "This lead may have been deleted."}
        </p>
        <Button className="mt-4" onClick={() => navigate({ to: "/leads" })}>
          Back to leads
        </Button>
      </Card>
    );
  }

  if (!data) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }
  const { lead, events, messages } = data;

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || isSendingMessage || !lead) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    // Optimistic message object
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      lead_id: leadId,
      direction: "outbound",
      phone: lead.mobile,
      body: messageText,
      status: "sending",
      created_at: new Date().toISOString(),
      wa_message_id: null,
      sent_at: null,
      delivered_at: null,
      read_at: null,
      replied_at: null,
      failed_at: null,
      error: null,
      api_response: null,
      retry_count: 0,
      updated_at: new Date().toISOString(),
    };

    // Update query cache optimistically
    qc.setQueryData(["lead", leadId], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        messages: [...oldData.messages, optimisticMessage],
      };
    });

    try {
      setIsSendingMessage(true);
      await sendMsgFn({
        data: {
          lead_id: leadId,
          body: messageText,
        },
      });
      toast.success("Message sent");
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
      // Update the optimistic message to failed in cache
      qc.setQueryData(["lead", leadId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          messages: oldData.messages.map((m: any) =>
            m.id === tempId ? { ...m, status: "failed", error: err.message } : m,
          ),
        };
      });
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function setStatus(status: string) {
    try {
      await updateFn({ data: { id: leadId, status: status as any } });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success("Status updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function resend() {
    try {
      await resendFn({ data: { lead_id: leadId } });
      toast.success("WhatsApp re-sent");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  }

  async function onDelete() {
    try {
      setIsDeleting(true);
      await qc.cancelQueries({ queryKey: ["lead", leadId] });
      await deleteFn({ data: { id: leadId } });
      toast.success("Lead deleted");
      qc.removeQueries({ queryKey: ["lead", leadId] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      navigate({ to: "/leads" });
    } catch (e: any) {
      setIsDeleting(false);
      toast.error(e?.message ?? "Failed to delete");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/leads" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Link to="/leads" className="text-xs text-muted-foreground hover:underline">
          All leads
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 shadow-card lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{lead.lead_code}</div>
              <h1 className="mt-1 font-display text-2xl font-bold">{lead.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className={statusColor(lead.status)}>
                  {lead.status}
                </Badge>
                <WaStatusPill status={lead.wa_status as any} />
                <Badge variant="secondary" className="text-[11px]">
                  {lead.source}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resend} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Resend WhatsApp
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the lead and all its messages, events, and retry
                      history. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete lead
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <InfoRow icon={Phone} label="Mobile" value={lead.mobile} />
            <InfoRow icon={Mail} label="Email" value={lead.email ?? "—"} />
            <InfoRow icon={Building2} label="Business" value={lead.business_name ?? "—"} />
            <InfoRow icon={MapPin} label="City" value={lead.city ?? "—"} />
          </div>

          {lead.notes && (
            <div className="mt-5 rounded-lg bg-muted/40 p-3 text-sm">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </div>
              {lead.notes}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </span>
            <Select value={lead.status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["new", "contacted", "qualified", "proposal", "won", "lost"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="overflow-hidden shadow-card flex flex-col">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-display font-semibold">Conversation</h2>
            <p className="text-xs text-muted-foreground">{messages.length} messages</p>
          </div>
          <div
            ref={messagesContainerRef}
            className="max-h-96 min-h-[300px] space-y-3 overflow-y-auto p-4"
          >
            {messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground">No messages yet.</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={"flex " + (m.direction === "outbound" ? "justify-end" : "justify-start")}
              >
                <div
                  className={
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft " +
                    (m.direction === "outbound"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground")
                  }
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] opacity-75">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {m.direction === "outbound" && (
                      <>
                        {m.status === "sent" && <Check className="h-3 w-3" />}
                        {m.status === "delivered" && <CheckCheck className="h-3 w-3" />}
                        {m.status === "read" && <CheckCheck className="h-3 w-3 text-info" />}
                        {m.status === "failed" && <XCircle className="h-3 w-3 text-destructive" />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3 bg-muted/20">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Type a WhatsApp message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                disabled={isSendingMessage}
              />
              <Button
                type="submit"
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={isSendingMessage || !newMessage.trim()}
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden shadow-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-display font-semibold">Timeline</h2>
        </div>
        <ol className="relative space-y-0 px-6 py-4">
          {events.map((e, i) => {
            const I = eventIcon[e.event_type] ?? Activity;
            return (
              <li key={e.id} className="flex gap-3 py-2">
                <div className="flex flex-col items-center">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
                    <I className="h-3.5 w-3.5" />
                  </div>
                  {i < events.length - 1 && <div className="h-full w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="text-sm">{e.description ?? e.event_type}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(e.occurred_at).toLocaleString()}
                  </div>
                </div>
              </li>
            );
          })}
          {events.length === 0 && (
            <li className="py-3 text-center text-sm text-muted-foreground">No events yet.</li>
          )}
        </ol>
      </Card>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  );
}
