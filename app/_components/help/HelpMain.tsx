"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, ReactMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Reorder, useDragControls } from "framer-motion";
import {
  Plus,
  Heading2,
  Type,
  ImageIcon,
  Video as VideoIcon,
  GripVertical,
  Pencil,
  Trash2,
  X,
  Loader2,
  HelpCircle,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Upload,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "isomorphic-dompurify";

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 180;

type BlockType = "heading" | "text" | "image" | "video";

type HelpBlock = {
  _id: Id<"helpContent">;
  type: BlockType;
  content?: string;
  storageId?: Id<"_storage">;
  caption?: string;
  order: number;
  url: string | null;
};

const RICH_TEXT_CLASSES =
  "[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_u]:underline " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 " +
  "[&_a]:text-[#4A6CF7] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80";

function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "strong", "em", "u", "a", "ul", "ol", "li", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

export default function HelpMain({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const blocks = useQuery(api.features.helpContent.getAll);
  const generateUploadUrl = useMutation(api.features.helpContent.generateUploadUrl);
  const addBlock = useMutation(api.features.helpContent.addBlock);
  const updateBlock = useMutation(api.features.helpContent.updateBlock);
  const deleteBlock = useMutation(api.features.helpContent.deleteBlock);
  const reorderBlocks = useMutation(api.features.helpContent.reorderBlocks);

  const [orderedBlocks, setOrderedBlocks] = useState<HelpBlock[]>([]);
  const [addingType, setAddingType] = useState<BlockType | null>(null);
  const [editingBlock, setEditingBlock] = useState<HelpBlock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HelpBlock | null>(null);
  const reorderSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (blocks) setOrderedBlocks(blocks as HelpBlock[]);
  }, [blocks]);

  const handleReorder = (next: HelpBlock[]) => {
    setOrderedBlocks(next);
    if (reorderSaveTimer.current) clearTimeout(reorderSaveTimer.current);
    reorderSaveTimer.current = setTimeout(async () => {
      try {
        await reorderBlocks({
          requestingUserId: userId,
          orderedIds: next.map((b) => b._id),
        });
      } catch {
        toast.error("Failed to save new order");
      }
    }, 500);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBlock({ requestingUserId: userId, id: deleteTarget._id });
      toast.success("Removed");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleteTarget(null);
    }
  };

  const isLoading = blocks === undefined;
  const isEmpty = !isLoading && orderedBlocks.length === 0;

  return (
    <div className="flex flex-1 h-full overflow-hidden px-1.5 md:px-0">
      <div className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col flex-1 w-full gap-4 overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg text-neutral-600 dark:text-neutral-300 font-medium">Help</h2>
          {isAdmin && (
            <AddBlockMenu onSelect={(type) => setAddingType(type)} />
          )}
        </div>

        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="max-w-3xl mx-auto pb-10">
            {/* Header banner — matches the dashboard's brand gradient hero style */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E232E] to-[#252C3A] border border-neutral-200 dark:border-neutral-700 p-6 mb-6 text-center">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#4A6CF7] opacity-10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#1fc0f1] opacity-10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-2">
                <div className="flex justify-center">
                  <div className="p-2.5 rounded-xl bg-white/10 border border-white/20">
                    <HelpCircle className="w-6 h-6 text-[#61DAFB]" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-white">Help &amp; Support</h1>
                <p className="text-neutral-400 text-sm max-w-md mx-auto">
                  Guides, tips, and answers to help you get the most out of M-Bingwa.
                </p>
              </div>
            </div>

            {isLoading && <LoadingSkeleton />}

            {isEmpty && <EmptyState isAdmin={isAdmin} onAdd={(t) => setAddingType(t)} />}

            {!isLoading && !isEmpty && (
              isAdmin ? (
                <Reorder.Group
                  axis="y"
                  values={orderedBlocks}
                  onReorder={handleReorder}
                  className="space-y-4"
                >
                  {orderedBlocks.map((block) => (
                    <DraggableBlock
                      key={block._id}
                      block={block}
                      onEdit={() => setEditingBlock(block)}
                      onDelete={() => setDeleteTarget(block)}
                    />
                  ))}
                </Reorder.Group>
              ) : (
                <div className="space-y-4">
                  {orderedBlocks.map((block) => (
                    <BlockView key={block._id} block={block} />
                  ))}
                </div>
              )
            )}
          </div>
        </ScrollArea>
      </div>

      {(addingType || editingBlock) && (
        <BlockFormModal
          userId={userId}
          type={addingType ?? (editingBlock as HelpBlock).type}
          existing={editingBlock}
          onClose={() => {
            setAddingType(null);
            setEditingBlock(null);
          }}
          addBlock={addBlock}
          updateBlock={updateBlock}
          generateUploadUrl={generateUploadUrl}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          block={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
        />
      ))}
    </div>
  );
}

function EmptyState({
  isAdmin,
  onAdd,
}: {
  isAdmin: boolean;
  onAdd: (type: BlockType) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
      <div className="p-4 rounded-full bg-blue-50 dark:bg-[#4A6CF7]/10 mb-4">
        <HelpCircle className="w-8 h-8 text-[#4A6CF7]" />
      </div>
      {isAdmin ? (
        <>
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
            Nothing here yet
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-5">
            Start building your Help page — add a heading, some text, an image, or a video.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => onAdd("heading")}>
              <Heading2 className="w-4 h-4" /> Heading
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAdd("text")}>
              <Type className="w-4 h-4" /> Text
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAdd("image")}>
              <ImageIcon className="w-4 h-4" /> Image
            </Button>
            <Button size="sm" variant="outline" onClick={() => onAdd("video")}>
              <VideoIcon className="w-4 h-4" /> Video
            </Button>
          </div>
        </>
      ) : (
        <>
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
            Help content is on its way
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
            Check back soon — guides and answers will appear here.
          </p>
        </>
      )}
    </div>
  );
}

function AddBlockMenu({ onSelect }: { onSelect: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const options: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: "heading", label: "Heading", icon: <Heading2 className="w-4 h-4" /> },
    { type: "text", label: "Text", icon: <Type className="w-4 h-4" /> },
    { type: "image", label: "Image", icon: <ImageIcon className="w-4 h-4" /> },
    { type: "video", label: "Video", icon: <VideoIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="bg-gradient-to-r from-[#4A6CF7] to-[#1fc0f1] text-white hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> Add block
      </Button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg z-20 overflow-hidden">
          {options.map((o) => (
            <button
              key={o.type}
              onClick={() => {
                onSelect(o.type);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DraggableBlock({
  block,
  onEdit,
  onDelete,
}: {
  block: HelpBlock;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={block}
      dragListener={false}
      dragControls={controls}
      className="group relative"
    >
      <div className="flex items-start gap-2">
        <button
          onPointerDown={(e) => controls.start(e)}
          className="mt-3 flex-shrink-0 cursor-grab active:cursor-grabbing text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-400 transition-colors touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0 relative">
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button size="icon" variant="ghost" className="h-7 w-7 bg-white/80 dark:bg-neutral-900/80" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 bg-white/80 dark:bg-neutral-900/80 hover:text-red-500" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <BlockView block={block} />
        </div>
      </div>
    </Reorder.Item>
  );
}

function BlockView({ block }: { block: HelpBlock }) {
  if (block.type === "heading") {
    return (
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 pt-2">
        {block.content}
      </h2>
    );
  }

  if (block.type === "text") {
    return (
      <div
        className={`text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 ${RICH_TEXT_CLASSES}`}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.content ?? "") }}
      />
    );
  }

  if (block.type === "image") {
    if (!block.url) return null;
    return (
      <figure className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.url} alt={block.caption ?? ""} className="w-full h-auto" />
        {block.caption && (
          <figcaption className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400 text-center">
            {block.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  if (block.type === "video") {
    if (!block.url) return null;
    return (
      <figure className="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-black">
        <video src={block.url} controls preload="metadata" className="w-full h-auto max-h-[480px]" />
        {block.caption && (
          <figcaption className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400 text-center bg-neutral-50 dark:bg-neutral-800">
            {block.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return null;
}

function DeleteConfirmModal({
  block,
  onCancel,
  onConfirm,
}: {
  block: HelpBlock;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">Delete this block?</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {block.type === "image" || block.type === "video"
              ? "This will permanently remove the file too. This can't be undone."
              : "This can't be undone."}
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              await onConfirm();
            }}
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BlockFormModal({
  userId,
  type,
  existing,
  onClose,
  addBlock,
  updateBlock,
  generateUploadUrl,
}: {
  userId: string;
  type: BlockType;
  existing: HelpBlock | null;
  onClose: () => void;
  addBlock: ReactMutation<typeof api.features.helpContent.addBlock>;
  updateBlock: ReactMutation<typeof api.features.helpContent.updateBlock>;
  generateUploadUrl: ReactMutation<typeof api.features.helpContent.generateUploadUrl>;
}) {
  const [headingText, setHeadingText] = useState(existing?.content ?? "");
  const [caption, setCaption] = useState(existing?.caption ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(existing?.url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
    ],
    content: type === "text" ? (existing?.content ?? "") : "",
  });

  const handleFileSelect = (selected: File | null) => {
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const maxMb = type === "image" ? MAX_IMAGE_MB : MAX_VIDEO_MB;
    if (selected.size > maxMb * 1024 * 1024) {
      setFileError(`File is too large — please pick one under ${maxMb}MB.`);
      return;
    }
    setFile(selected);
    setFilePreviewUrl(URL.createObjectURL(selected));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (type === "heading") {
        const trimmed = headingText.trim();
        if (!trimmed) {
          toast.error("Heading can't be empty");
          setIsSaving(false);
          return;
        }
        if (existing) {
          await updateBlock({ requestingUserId: userId, id: existing._id, content: trimmed });
        } else {
          await addBlock({ requestingUserId: userId, type: "heading", content: trimmed });
        }
      } else if (type === "text") {
        const html = editor?.getHTML().trim() ?? "";
        if (!html || html === "<p></p>") {
          toast.error("Text can't be empty");
          setIsSaving(false);
          return;
        }
        if (existing) {
          await updateBlock({ requestingUserId: userId, id: existing._id, content: html });
        } else {
          await addBlock({ requestingUserId: userId, type: "text", content: html });
        }
      } else {
        // image or video
        let storageId: Id<"_storage"> | undefined;
        if (file) {
          setUploadProgress(0);
          const uploadUrl = await generateUploadUrl({ requestingUserId: userId });
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!result.ok) throw new Error("Upload failed");
          const json = await result.json();
          storageId = json.storageId;
          setUploadProgress(100);
        } else if (!existing) {
          toast.error(`Please choose ${type === "image" ? "an image" : "a video"} to upload`);
          setIsSaving(false);
          return;
        }

        if (existing) {
          await updateBlock({
            requestingUserId: userId,
            id: existing._id,
            storageId,
            caption: caption.trim() || undefined,
          });
        } else {
          await addBlock({
            requestingUserId: userId,
            type,
            storageId,
            caption: caption.trim() || undefined,
          });
        }
      }
      toast.success(existing ? "Updated" : "Added");
      onClose();
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const titleLabel =
    type === "heading" ? "Heading" : type === "text" ? "Text" : type === "image" ? "Image" : "Video";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
            {existing ? "Edit" : "Add"} {titleLabel}
          </h3>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {type === "heading" && (
            <Input
              value={headingText}
              onChange={(e) => setHeadingText(e.target.value)}
              placeholder="e.g. Getting Started"
              maxLength={120}
              autoFocus
            />
          )}

          {type === "text" && editor && (
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
                <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                  <Bold className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                  <Italic className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                  <UnderlineIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton
                  active={editor.isActive("link")}
                  onClick={() => {
                    const url = window.prompt("Enter URL");
                    if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                  }}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                  <List className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                  <ListOrdered className="w-3.5 h-3.5" />
                </ToolbarButton>
              </div>
              <EditorContent
                editor={editor}
                className={`px-3 py-2 min-h-[120px] max-h-[240px] overflow-y-auto text-sm text-neutral-700 dark:text-neutral-200 focus:outline-none ${RICH_TEXT_CLASSES}`}
              />
            </div>
          )}

          {(type === "image" || type === "video") && (
            <>
              <label className="block">
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600 py-8 px-4 cursor-pointer hover:border-[#4A6CF7]/50 transition-colors">
                  <Upload className="w-6 h-6 text-neutral-400" />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400 text-center">
                    {file ? file.name : `Click to choose ${type === "image" ? "an image" : "a video"}`}
                  </span>
                  <span className="text-xs text-neutral-400">
                    Max {type === "image" ? MAX_IMAGE_MB : MAX_VIDEO_MB}MB
                  </span>
                </div>
                <input
                  type="file"
                  accept={type === "image" ? "image/*" : "video/*"}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
              </label>
              {fileError && <p className="text-xs text-red-500">{fileError}</p>}

              {filePreviewUrl && (
                <div className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
                  {type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={filePreviewUrl} alt="Preview" className="w-full h-auto max-h-56 object-contain bg-neutral-50 dark:bg-neutral-800" />
                  ) : (
                    <video src={filePreviewUrl} controls className="w-full h-auto max-h-56" />
                  )}
                </div>
              )}

              {uploadProgress !== null && uploadProgress < 100 && (
                <div className="flex items-center gap-2 text-sm text-neutral-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                </div>
              )}

              <Input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption (optional)"
                maxLength={200}
              />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-[#4A6CF7] to-[#1fc0f1] text-white hover:opacity-90"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : existing ? "Save changes" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-[#4A6CF7]/10 text-[#4A6CF7]"
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}
