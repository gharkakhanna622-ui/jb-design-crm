import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTemplates, upsertTemplate } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useState } from "react";
import { Edit2, Plus, Star, StarOff, ToggleLeft, ToggleRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({ meta: [{ title: "Templates — Pulse CRM" }] }),
  component: TemplatesPage,
});

type Template = {
  id?: string;
  name: string;
  language: string;
  body: string | null;
  is_default: boolean;
  is_active: boolean;
};

function TemplatesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTemplates);
  const upsertFn = useServerFn(upsertTemplate);
  const { data, refetch } = useQuery({ queryKey: ["templates"], queryFn: () => listFn() });

  const [isOpen, setIsOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const openAddModal = () => {
    setEditingTemplate(null);
    setName("");
    setLanguage("en");
    setBody("");
    setIsActive(true);
    setIsDefault(false);
    setIsOpen(true);
  };

  const openEditModal = (t: Template) => {
    setEditingTemplate(t);
    setName(t.name);
    setLanguage(t.language);
    setBody(t.body ?? "");
    setIsActive(t.is_active);
    setIsDefault(t.is_default);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!language.trim()) {
      toast.error("Language is required");
      return;
    }

    try {
      setIsSaving(true);
      await upsertFn({
        data: {
          id: editingTemplate?.id,
          name: name.trim(),
          language: language.trim(),
          body: body.trim() || undefined,
          is_active: isActive,
          is_default: isDefault,
        },
      });
      toast.success(editingTemplate ? "Template updated" : "Template created");
      setIsOpen(false);
      qc.invalidateQueries({ queryKey: ["templates"] });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (t: Template) => {
    try {
      await upsertFn({
        data: {
          id: t.id,
          name: t.name,
          language: t.language,
          body: t.body ?? undefined,
          is_active: t.is_active,
          is_default: true,
        },
      });
      toast.success(`Set "${t.name}" as default template`);
      qc.invalidateQueries({ queryKey: ["templates"] });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to set default template");
    }
  };

  const handleToggleActive = async (t: Template) => {
    try {
      await upsertFn({
        data: {
          id: t.id,
          name: t.name,
          language: t.language,
          body: t.body ?? undefined,
          is_active: !t.is_active,
          is_default: t.is_default,
        },
      });
      toast.success(`"${t.name}" is now ${!t.is_active ? "Active" : "Inactive"}`);
      qc.invalidateQueries({ queryKey: ["templates"] });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update template status");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">WhatsApp templates</h1>
          <p className="text-sm text-muted-foreground">
            The default template is sent automatically when a new lead arrives. Templates must first
            be approved by Meta in the WhatsApp Business Manager.
          </p>
        </div>
        <Button onClick={openAddModal} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add template
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(data?.templates ?? []).map((t) => (
          <Card
            key={t.id}
            className="group relative flex flex-col justify-between space-y-3 p-5 shadow-soft hover:shadow-card transition-shadow"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg font-semibold flex items-center gap-1.5">
                    {t.name}
                    {t.is_default && <Star className="h-4 w-4 text-warning fill-warning" />}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                    {t.language}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={t.is_active ? "secondary" : "outline"}>
                    {t.is_active ? "Active" : "Inactive"}
                  </Badge>
                  {t.is_default && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-transparent">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
              {t.body && (
                <p className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap font-mono text-muted-foreground border border-border/30">
                  {t.body}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => handleToggleActive(t)}
                title={t.is_active ? "Deactivate template" : "Activate template"}
              >
                {t.is_active ? (
                  <>
                    <ToggleRight className="h-4 w-4 text-success" /> Disable
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" /> Enable
                  </>
                )}
              </Button>
              {!t.is_default && t.is_active && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-warning hover:text-warning"
                  onClick={() => handleSetDefault(t)}
                >
                  <Star className="h-3.5 w-3.5" /> Make Default
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => openEditModal(t)}
              >
                <Edit2 className="h-3 w-3" /> Edit
              </Button>
            </div>
          </Card>
        ))}
        {!data?.templates.length && (
          <Card className="p-8 text-center text-sm text-muted-foreground md:col-span-2">
            No templates configured yet. Add your Meta-approved template here to use it.
          </Card>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit template" : "Add approved template"}
              </DialogTitle>
              <DialogDescription>
                Make sure the name and language exactly match the template approved in your Meta App
                Dashboard.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., justdial_lead_welcome_infobip"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="language">Language Code</Label>
                <Input
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g., en or hi"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="body">Template Body (Optional)</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hello {{1}}, thank you for your query..."
                  rows={4}
                />
                <span className="text-[11px] text-muted-foreground">
                  Variables are replaced sequentially (e.g. &#123;&#123;1&#125;&#125; is replaced
                  with lead name).
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="is-active">Active status</Label>
                  <p className="text-xs text-muted-foreground">Can be used for WhatsApp dispatch</p>
                </div>
                <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="is-default">Default template</Label>
                  <p className="text-xs text-muted-foreground">
                    Sent automatically to new incoming leads
                  </p>
                </div>
                <Switch
                  id="is-default"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                  disabled={editingTemplate?.is_default} // Cannot unset default unless setting another default
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
