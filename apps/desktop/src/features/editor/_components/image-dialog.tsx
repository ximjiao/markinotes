"use client";

import React, { useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Link as LinkIcon, Image as ImageIcon, X } from "lucide-react";

interface ImageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage: (src: string) => void;
}

export function ImageDialog({ isOpen, onClose, onInsertImage }: ImageDialogProps) {
  const [imageUrl, setImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          onInsertImage(base64);
          onClose();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEmbedLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl.trim()) {
      onInsertImage(imageUrl.trim());
      setImageUrl("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto w-96 p-3.5 bg-popover border border-border rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <span className="text-xs font-semibold text-txt-primary flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-txt-brand" /> Add Image
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-txt-muted hover:text-txt-primary"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 bg-accent/50 p-1">
            <TabsTrigger value="upload" className="text-xs gap-1.5 font-medium">
              <Upload className="h-3.5 w-3.5" /> Upload
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs gap-1.5 font-medium">
              <LinkIcon className="h-3.5 w-3.5" /> Link
            </TabsTrigger>
          </TabsList>

          {/* 1. Local File Upload */}
          <TabsContent value="upload" className="mt-3 flex flex-col gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 text-xs gap-2 border-dashed border-border/80 hover:bg-accent/40 hover:border-primary/50 transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-txt-brand" />
              Upload file
            </Button>
            <p className="text-[10px] text-txt-muted text-center">
              Select PNG, JPG, GIF, or WebP from your computer
            </p>
          </TabsContent>

          {/* 2. Embed from URL Link */}
          <TabsContent value="link" className="mt-3">
            <form onSubmit={handleEmbedLink} className="flex flex-col gap-2">
              <Input
                type="url"
                placeholder="Paste an image link..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" className="w-full text-xs h-8" disabled={!imageUrl.trim()}>
                Embed image
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
