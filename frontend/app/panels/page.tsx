"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Plus, Trash2, MapPin, Gauge, Calendar } from "lucide-react";
import { toast } from "sonner";
import { listPanels, createPanel, deletePanel, type Panel, type PanelCreate } from "@/lib/api";

const defaultForm: PanelCreate = {
  name: "", lat: 0, lon: 0, area_m2: 0, efficiency: 0, electricity_rate: 8.0,
};

export default function PanelsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [installedAt, setInstalledAt] = useState("");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => listPanels().then(setPanels);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPanel({ ...form, installed_at: installedAt || null });
      setForm(defaultForm);
      setInstalledAt("");
      setOpen(false);
      load();
      toast.success("Panel created successfully");
    } catch (err: any) {
      toast.error("Failed to create panel", { description: err.message });
    }
    setSubmitting(false);
  };

  const handleDelete = async (panel: Panel) => {
    if (!confirm(`Delete panel "${panel.name}"?`)) return;
    await deletePanel(panel.id);
    load();
    toast.success(`Deleted ${panel.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Solar Panels</h1>
          <p className="text-sm text-muted-foreground">Manage your registered panels</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> Add Panel
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Register New Panel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Panel Name</Label>
                  <Input id="name" required placeholder="e.g. Rooftop Panel 1"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="lat">Latitude</Label>
                  <Input id="lat" type="number" step="any" required placeholder="13.08"
                    onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="lon">Longitude</Label>
                  <Input id="lon" type="number" step="any" required placeholder="80.27"
                    onChange={(e) => setForm({ ...form, lon: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="area">Area (m²)</Label>
                  <Input id="area" type="number" step="0.1" required placeholder="2.0"
                    onChange={(e) => setForm({ ...form, area_m2: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="eff">Efficiency (0-1)</Label>
                  <Input id="eff" type="number" step="0.01" min="0.01" max="1" required placeholder="0.18"
                    onChange={(e) => setForm({ ...form, efficiency: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="rate">Rate (per kWh)</Label>
                  <Input id="rate" type="number" step="0.1" required value={form.electricity_rate}
                    onChange={(e) => setForm({ ...form, electricity_rate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label htmlFor="installed">Installed Date</Label>
                  <Input id="installed" type="date" value={installedAt}
                    onChange={(e) => setInstalledAt(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Panel"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {panels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No panels registered yet. Click &quot;Add Panel&quot; to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {panels.map((p) => (
            <Card key={p.id} className="group relative transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    onClick={() => handleDelete(p)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{p.lat.toFixed(4)}, {p.lon.toFixed(4)}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Area</span>
                    <p className="font-medium">{p.area_m2} m²</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Efficiency</span>
                    <p className="font-medium">{(p.efficiency * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rate</span>
                    <p className="font-medium">₹{p.electricity_rate}/kWh</p>
                  </div>
                  {p.installed_at && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{p.installed_at}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
