"use client";

import { useEffect, useState, useCallback } from "react";
import { useUIStore } from "@/lib/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import { toast } from "sonner";
import {
  Save,
  Plus,
  Trash2,
  Building2,
  ReceiptText,
  ShieldAlert,
  Loader2,
  X,
  Crop as CropIcon,
  Check,
  Store,
  Shield,
  Receipt,
  Phone
} from "lucide-react";
import * as Accordion from "@radix-ui/react-accordion";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";
import { APP_NAME } from "@/lib/utils/constants";

interface Permission {
  id: string;
  role: string;
  resource: string;
  action: string;
  is_allowed: boolean;
}

// Utility to compress logo for receipt printing (max 256x256, grayscale)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Fill background with white before drawing
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // Export as highly compressed JPEG
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } else {
          reject(new Error("Canvas context failed"));
        }
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
};

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { setGlobalStoreName } = useUIStore();

  // General Settings State
  const [bakeryName, setBakeryName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [shiftCashiers, setShiftCashiers] = useState<string[]>([]);
  const [newCashierName, setNewCashierName] = useState("");
  
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [receiptLogo, setReceiptLogo] = useState<string | null>(null);
  const [receiptShowLogo, setReceiptShowLogo] = useState(true);
  const [receiptFontFamily, setReceiptFontFamily] = useState("'Arial', sans-serif");
  const [receiptFontSize, setReceiptFontSize] = useState("text-sm");

  // Cropper State
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Permissions State
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("cashier");

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
      if (!cropImageSrc || !croppedAreaPixels) return;
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels, 0);
      if (croppedBlob) {
        // Convert Blob to File
        const croppedFile = new File([croppedBlob], "logo.png", { type: "image/png" });
        const base64 = await compressImage(croppedFile);
        setReceiptLogo(base64);
        setCropImageSrc(null);
      }
    } catch (e) {
      toast.error("Failed to crop image");
    }
  };

  async function fetchSettings() {
    setIsLoading(true);
    try {
      // Fetch Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*");
      
      if (settingsError) throw settingsError;

      if (settingsData) {
        const profile = settingsData.find(s => s.key === "bakery_profile")?.value;
        if (profile) {
          setBakeryName(profile.bakery_name || "");
          setAddress(profile.address || "");
          setPhone(profile.phone || "");
          setEmail(profile.email || "");
          setShiftCashiers(profile.shift_cashiers || []);
        }

        const receipt = settingsData.find(s => s.key === "receipt_settings")?.value;
        if (receipt) {
          setReceiptHeader(receipt.header || "");
          setReceiptFooter(receipt.footer || "");
          if (receipt.logo) setReceiptLogo(receipt.logo);
          if (receipt.show_logo !== undefined) setReceiptShowLogo(receipt.show_logo);
          if (receipt.font_family) setReceiptFontFamily(receipt.font_family);
          if (receipt.font_size) setReceiptFontSize(receipt.font_size);
        }
      }

      // Fetch Permissions
      const { data: permData, error: permError } = await supabase
        .from("permissions")
        .select("*")
        .order("resource")
        .order("action");
      
      if (permError) throw permError;
      
      if (permData) {
        setPermissions(permData as Permission[]);
      }

    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10) {
        toast.error("Phone number must be exactly 10 digits");
        return;
      }
    }

    setIsSaving(true);
    try {
      const { error: profileError } = await supabase
        .from("settings")
        .update({ value: { bakery_name: bakeryName, address, phone, email, shift_cashiers: shiftCashiers } })
        .eq("key", "bakery_profile");
      
      if (profileError) throw profileError;

      const { error: receiptError } = await supabase
        .from("settings")
        .update({ value: { header: receiptHeader, footer: receiptFooter, auto_print: false, width: "80mm", logo: receiptLogo, show_logo: receiptShowLogo, font_family: receiptFontFamily, font_size: receiptFontSize } })
        .eq("key", "receipt_settings");
      
      if (receiptError) throw receiptError;

      setGlobalStoreName(bakeryName);
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCashier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashierName.trim()) return;
    if (!shiftCashiers.includes(newCashierName.trim())) {
      setShiftCashiers([...shiftCashiers, newCashierName.trim()]);
    }
    setNewCashierName("");
  };

  const handleRemoveCashier = (name: string) => {
    setShiftCashiers(shiftCashiers.filter(c => c !== name));
  };

  const handleTogglePermission = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("permissions")
        .update({ is_allowed: !currentValue })
        .eq("id", id);
      
      if (error) throw error;
      
      setPermissions(prev => prev.map(p => p.id === id ? { ...p, is_allowed: !currentValue } : p));
      toast.success("Permission updated");
    } catch (error: any) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
    }
  };

  const roles = ["cashier", "stock_manager", "accountant", "admin"];
  
  // Group permissions for the selected role by resource
  const filteredPermissions = permissions.filter(p => p.role === selectedRole);
  const resources = Array.from(new Set(filteredPermissions.map(p => p.resource)));

  return (
    <ProtectedRoute resource="settings" action="update">
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-background w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-lg">Crop Logo</h3>
              <button onClick={() => setCropImageSrc(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-[400px] bg-black">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>
            <div className="p-4 border-t border-border flex justify-between items-center bg-muted/30">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-1/2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setCropImageSrc(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
                >
                  <CropIcon className="w-4 h-4" />
                  Crop & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full bg-muted/10 overflow-hidden">
        <div className="px-4 md:px-8 pt-6 pb-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your bakery profile, receipts, and staff permissions.</p>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs.Root defaultValue="general" className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 md:px-8 py-6">
            <Tabs.List className="flex border-b border-border mb-6">
              <Tabs.Trigger
                value="general"
                className="px-6 py-3 font-medium text-sm text-muted-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground transition-all hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  General Settings
                </div>
              </Tabs.Trigger>
              <Tabs.Trigger
                value="permissions"
                className="px-6 py-3 font-medium text-sm text-muted-foreground border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground transition-all hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Role Permissions
                </div>
              </Tabs.Trigger>
            </Tabs.List>

            {/* General Settings Tab */}
            <Tabs.Content value="general" className="flex-1 overflow-y-auto outline-none animate-in fade-in slide-in-from-bottom-2">
              <div className="max-w-2xl bg-card rounded-2xl border border-border shadow-sm p-6 mb-8">
                <form onSubmit={handleSaveGeneral} className="space-y-8">
                  {/* Bakery Profile */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-heading font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      Bakery Profile
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                          Store Name <Shield className="w-3 h-3 text-muted-foreground" />
                        </label>
                        <input
                          type="text"
                          value={bakeryName}
                          disabled={true}
                          className="w-full px-4 py-2 bg-muted/50 text-muted-foreground border border-border rounded-xl cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          This name is locked by the developer for branding purposes.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Address</label>
                        <textarea
                          required
                          rows={2}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="store@example.com"
                          className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shift Cashiers */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-heading font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Shift Cashiers
                    </h3>
                    <p className="text-sm text-muted-foreground">Add names of physical cashiers who will use the POS terminal. They can select their name before checking out.</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCashierName}
                        onChange={(e) => setNewCashierName(e.target.value)}
                        placeholder="Enter cashier name..."
                        className="flex-1 min-w-0 px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCashier(e);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCashier}
                        className="shrink-0 px-4 py-2 bg-secondary text-secondary-foreground font-semibold rounded-xl hover:bg-secondary/90 transition-all"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {shiftCashiers.map(cashier => (
                        <div key={cashier} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                          {cashier}
                          <button
                            type="button"
                            onClick={() => handleRemoveCashier(cashier)}
                            className="hover:text-destructive transition-colors ml-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {shiftCashiers.length === 0 && (
                        <span className="text-sm text-muted-foreground italic">No shift cashiers added yet.</span>
                      )}
                    </div>
                  </div>

                  {/* Receipt Configuration */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-heading font-semibold flex items-center gap-2 border-b border-border/50 pb-2">
                      <Receipt className="w-5 h-5 text-primary" />
                      Receipt Configuration
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Receipt Header Message</label>
                        <textarea
                          rows={2}
                          value={`Welcome to ${APP_NAME}!`}
                          disabled
                          className="w-full px-4 py-2 bg-muted text-muted-foreground border border-border rounded-xl cursor-not-allowed resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Receipt header is locked to the global configuration.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Receipt Footer Message</label>
                        <textarea
                          rows={2}
                          value={receiptFooter}
                          onChange={(e) => setReceiptFooter(e.target.value)}
                          className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                          placeholder="Thank you! Visit again!"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">Show Logo on Receipt</label>
                          <button
                            type="button"
                            onClick={() => setReceiptShowLogo(!receiptShowLogo)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              receiptShowLogo ? "bg-primary" : "bg-muted"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                receiptShowLogo ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Toggle to completely hide the logo block (including text initials) to save receipt paper.
                        </p>
                      </div>
                      
                      {receiptShowLogo && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Custom Receipt Logo (Optional)</label>
                          <div className="flex items-center gap-4">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onload = () => {
                                  setCropImageSrc(reader.result as string);
                                };
                              }
                            }}
                            className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                          />
                          {receiptLogo && (
                            <div className="relative">
                              <img src={receiptLogo} alt="Logo preview" className="w-16 h-16 object-contain rounded-md border border-border" />
                              <button
                                type="button"
                                onClick={() => setReceiptLogo(null)}
                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Image will be automatically compressed and resized for thermal printing.
                        </p>
                      </div>
                      )}
                      
                      <div className="space-y-2 pt-4 border-t border-border">
                        <label className="text-sm font-medium text-foreground">Receipt Font Style</label>
                        <select
                          value={receiptFontFamily}
                          onChange={(e) => setReceiptFontFamily(e.target.value)}
                          className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="'Arial', sans-serif">Arial (Modern, Clean)</option>
                          <option value="'Courier New', Courier, monospace">Courier New (Classic Receipt)</option>
                          <option value="'Inter', sans-serif">Inter (Sleek, Tech)</option>
                          <option value="'Roboto Mono', monospace">Roboto Mono (Highly Readable)</option>
                          <option value="'Playfair Display', serif">Playfair Display (Elegant, Boutique)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Base Font Size</label>
                        <select
                          value={receiptFontSize}
                          onChange={(e) => setReceiptFontSize(e.target.value)}
                          className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                          <option value="text-xs">Small (Saves paper, good for 58mm)</option>
                          <option value="text-sm">Normal (Standard thermal size)</option>
                          <option value="text-base">Large (Bolder, extremely readable)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </Tabs.Content>

            {/* Permissions Tab */}
            <Tabs.Content value="permissions" className="flex-1 flex flex-col min-h-0 outline-none animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col min-h-0 flex-1 overflow-hidden">
                <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/10 shrink-0">
                  <span className="text-sm font-medium text-foreground whitespace-nowrap shrink-0">Select Role:</span>
                  <div className="flex overflow-x-auto pb-2 -mb-2 w-full gap-2 scrollbar-none">
                    {roles.map(role => (
                      <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors border whitespace-nowrap",
                          selectedRole === role
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        )}
                      >
                        {role.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-0">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-[600px]">
                    <thead className="bg-muted/30 sticky top-0 backdrop-blur-sm z-10">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-muted-foreground border-b border-border w-1/3">Resource Name</th>
                        <th className="px-6 py-4 font-semibold text-muted-foreground border-b border-border text-center">Create</th>
                        <th className="px-6 py-4 font-semibold text-muted-foreground border-b border-border text-center">Read</th>
                        <th className="px-6 py-4 font-semibold text-muted-foreground border-b border-border text-center">Update</th>
                        <th className="px-6 py-4 font-semibold text-muted-foreground border-b border-border text-center">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {resources.map(resource => {
                        const resPerms = filteredPermissions.filter(p => p.resource === resource);
                        const getAction = (action: string) => resPerms.find(p => p.action === action);
                        
                        const createPerm = getAction("create");
                        const readPerm = getAction("read");
                        const updatePerm = getAction("update");
                        const deletePerm = getAction("delete");

                        return (
                          <tr key={resource} className="hover:bg-muted/10 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground capitalize">
                              {resource.replace("_", " ")}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {createPerm && (
                                <input
                                  type="checkbox"
                                  checked={createPerm.is_allowed}
                                  onChange={() => handleTogglePermission(createPerm.id, createPerm.is_allowed)}
                                  disabled={selectedRole === "admin"}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                                />
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {readPerm && (
                                <input
                                  type="checkbox"
                                  checked={readPerm.is_allowed}
                                  onChange={() => handleTogglePermission(readPerm.id, readPerm.is_allowed)}
                                  disabled={selectedRole === "admin"}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                                />
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {updatePerm && (
                                <input
                                  type="checkbox"
                                  checked={updatePerm.is_allowed}
                                  onChange={() => handleTogglePermission(updatePerm.id, updatePerm.is_allowed)}
                                  disabled={selectedRole === "admin"}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                                />
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {deletePerm && (
                                <input
                                  type="checkbox"
                                  checked={deletePerm.is_allowed}
                                  onChange={() => handleTogglePermission(deletePerm.id, deletePerm.is_allowed)}
                                  disabled={selectedRole === "admin"}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {resources.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                            No permissions found for this role.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        )}
      </div>
    </ProtectedRoute>
  );
}
