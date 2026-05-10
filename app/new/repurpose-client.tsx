"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Copy, Download, FileUp, Loader2, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RepurposeOutputKey =
  | "linkedinCarousel"
  | "twitterThread"
  | "emailSequence"
  | "shortVideoScript"
  | "seoBlogPost"
  | "instagramThreadsCaptions";

type CarouselSlide = {
  slideNumber: number;
  title: string;
  body: string;
  cta: string | null;
};

type EmailSequenceEmail = {
  emailNumber: number;
  subject: string;
  body: string;
};

type RepurposeResult = {
  linkedinCarousel: CarouselSlide[];
  twitterThread: string;
  emailSequence: EmailSequenceEmail[];
  shortVideoScript: string;
  seoBlogPost: string;
  instagramThreadsCaptions: string;
};

const outputConfig: Array<{ key: RepurposeOutputKey; label: string }> = [
  { key: "linkedinCarousel", label: "LinkedIn Carousel" },
  { key: "twitterThread", label: "Twitter/X Thread" },
  { key: "emailSequence", label: "Email Sequence" },
  { key: "shortVideoScript", label: "Short Video Script + Captions" },
  { key: "seoBlogPost", label: "SEO Blog Post" },
  { key: "instagramThreadsCaptions", label: "Instagram/Threads Captions" }
];
const loadingSteps = ["Transcribing", "Voice Analysis", "Generating Assets"];

// No parseLinkedInSlides needed — the API now returns structured slide objects

export function NewRepurposeClient({ generationsUsed = 0 }: { generationsUsed?: number }) {
  const [youtubeLink, setYoutubeLink] = useState("");
  const [rawText, setRawText] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [voiceSamples, setVoiceSamples] = useState<string[]>(["", "", ""]);
  const [voiceFiles, setVoiceFiles] = useState<File[]>([]);
  const [results, setResults] = useState<RepurposeResult | null>(null);
  const [copiedOutputKey, setCopiedOutputKey] = useState<RepurposeOutputKey | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [isDraggingSource, setIsDraggingSource] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [isVoiceBusy, setIsVoiceBusy] = useState(false);
  const [hasSavedVoice, setHasSavedVoice] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [showPdfToast, setShowPdfToast] = useState(false);

  const sourceReady = useMemo(() => {
    return Boolean(youtubeLink.trim() || rawText.trim() || sourceFile);
  }, [youtubeLink, rawText, sourceFile]);

  const canRepurpose = sourceReady && voiceReady && !isLoading;
  const providedVoiceSampleCount = voiceSamples.filter((sample) => sample.trim().length > 0).length + voiceFiles.length;
  const sourcePreviewItems = [
    sourceFile ? `File: ${sourceFile.name}` : null,
    youtubeLink.trim() ? `YouTube: ${youtubeLink.trim()}` : null,
    rawText.trim() ? "Text pasted" : null
  ].filter(Boolean) as string[];
  const copyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingStepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pdfToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minVoiceTextareas = 3;
  const maxVoiceTextareas = 5;
  const carouselSlides = useMemo(() => {
    if (!results) return [];
    return Array.isArray(results.linkedinCarousel) ? results.linkedinCarousel : [];
  }, [results]);

  const emailSequenceEmails = useMemo(() => {
    if (!results) return [];
    return Array.isArray(results.emailSequence) ? results.emailSequence : [];
  }, [results]);

  const handleSourceFile = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setSourceFile(fileList[0]);
  };

  const handleSourceDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingSource(false);
    handleSourceFile(event.dataTransfer.files);
  };

  const handleVoiceFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected?.length) return;
    setVoiceFiles(Array.from(selected));
    setVoiceReady(false);
    setVoiceMessage("Voice files updated. Save My Voice again to confirm.");
  };

  const removeVoiceFile = (index: number) => {
    setVoiceFiles((prev) => prev.filter((_, i) => i !== index));
    setVoiceReady(false);
    setVoiceMessage("Voice files changed. Save My Voice again.");
  };

  const updateVoiceSample = (index: number, value: string) => {
    setVoiceSamples((prev) => prev.map((sample, i) => (i === index ? value : sample)));
    setVoiceReady(false);
    setVoiceMessage("Voice samples changed. Save My Voice again.");
  };

  const addVoiceSample = () => {
    if (voiceSamples.length >= maxVoiceTextareas) return;
    setVoiceSamples((prev) => [...prev, ""]);
    setVoiceReady(false);
    setVoiceMessage("New sample added. Save My Voice when done.");
  };

  const removeVoiceSample = (index: number) => {
    if (voiceSamples.length <= minVoiceTextareas) return;
    setVoiceSamples((prev) => prev.filter((_, i) => i !== index));
    setVoiceReady(false);
    setVoiceMessage("A sample was removed. Save My Voice again.");
  };

  const applyLoadedSamples = (samples: string[]) => {
    const cleaned = samples.map((sample) => sample.trim()).filter(Boolean).slice(0, maxVoiceTextareas);
    const padded = [...cleaned];
    while (padded.length < minVoiceTextareas) {
      padded.push("");
    }
    setVoiceSamples(padded);
  };

  const loadSavedVoice = useCallback(async () => {
    setIsVoiceBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-profile", {
        method: "GET"
      });

      if (!response.ok) {
        if (response.status === 404) {
          setHasSavedVoice(false);
          setVoiceMessage("No saved voice profile found yet. Add samples and click Save My Voice.");
          setVoiceReady(false);
          return;
        }

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to load saved voice.");
      }

      const payload = (await response.json()) as { voiceSamples: string[] };
      applyLoadedSamples(payload.voiceSamples);
      setHasSavedVoice(true);
      setVoiceReady(true);
      setVoiceMessage("Your saved voice is loaded. You can edit and save again anytime.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load saved voice profile.";
      setError(message);
    } finally {
      setIsVoiceBusy(false);
    }
  }, []);

  const saveVoice = async () => {
    if (providedVoiceSampleCount < 3) {
      setError("Please provide at least 3 voice samples (text or files) before saving.");
      setVoiceReady(false);
      return;
    }

    const persistedSamples = [
      ...voiceSamples.map((sample) => sample.trim()).filter(Boolean),
      ...voiceFiles.map((file) => `[File sample] ${file.name}`)
    ].slice(0, maxVoiceTextareas);

    setIsVoiceBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/voice-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          voiceSamples: persistedSamples
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to save voice profile.");
      }

      applyLoadedSamples(persistedSamples);
      setHasSavedVoice(true);
      setVoiceReady(true);
      setVoiceMessage("Voice profile saved successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save voice profile.";
      setError(message);
      setVoiceReady(false);
    } finally {
      setIsVoiceBusy(false);
    }
  };

  useEffect(() => {
    void loadSavedVoice();

    return () => {
      if (copyResetTimeoutRef.current) {
        clearTimeout(copyResetTimeoutRef.current);
      }
      if (loadingStepIntervalRef.current) {
        clearInterval(loadingStepIntervalRef.current);
      }
      if (pdfToastTimeoutRef.current) {
        clearTimeout(pdfToastTimeoutRef.current);
      }
    };
  }, [loadSavedVoice]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStepIndex(0);
      if (loadingStepIntervalRef.current) {
        clearInterval(loadingStepIntervalRef.current);
      }
      return;
    }

    loadingStepIntervalRef.current = setInterval(() => {
      setLoadingStepIndex((current) => (current < loadingSteps.length - 1 ? current + 1 : current));
    }, 3500);

    return () => {
      if (loadingStepIntervalRef.current) {
        clearInterval(loadingStepIntervalRef.current);
      }
    };
  }, [isLoading]);

  const copyOutput = async (key: RepurposeOutputKey) => {
    if (!results) return;
    let text: string;
    if (key === "linkedinCarousel") {
      text = carouselSlides
        .map((s) => `Slide ${s.slideNumber}: ${s.title}\n${s.body}${s.cta ? `\n${s.cta}` : ""}`)
        .join("\n\n");
    } else if (key === "emailSequence") {
      text = emailSequenceEmails
        .map((e) => `Email ${e.emailNumber}\nSubject: ${e.subject}\n\n${e.body}`)
        .join("\n\n---\n\n");
    } else {
      text = results[key] as string;
    }
    await navigator.clipboard.writeText(text);
    setCopiedOutputKey(key);

    if (copyResetTimeoutRef.current) {
      clearTimeout(copyResetTimeoutRef.current);
    }

    copyResetTimeoutRef.current = setTimeout(() => {
      setCopiedOutputKey(null);
    }, 2500);
  };

  const clearSourceItem = (item: "file" | "youtube" | "text") => {
    if (item === "file") setSourceFile(null);
    if (item === "youtube") setYoutubeLink("");
    if (item === "text") setRawText("");
  };

  const clearAllSource = () => {
    setSourceFile(null);
    setYoutubeLink("");
    setRawText("");
  };

  const downloadLinkedInCarouselPdf = () => {
    if (!results) return;

    const slides = carouselSlides.length
      ? carouselSlides
      : [{ slideNumber: 1, title: "LinkedIn Carousel", body: "No slides generated.", cta: null }];

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4"
    });

    slides.forEach((slide, index) => {
      if (index > 0) {
        doc.addPage();
      }

      doc.setFillColor(249, 250, 251);
      doc.rect(40, 40, 515, 762, "F");
      doc.setDrawColor(228, 228, 231);
      doc.rect(40, 40, 515, 762);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`Slide ${slide.slideNumber}`, 64, 84);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      const titleLines = doc.splitTextToSize(slide.title || `Slide ${slide.slideNumber}`, 470);
      doc.text(titleLines, 64, 130);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const bodyLines = doc.splitTextToSize(slide.body || "", 470);
      doc.text(bodyLines, 64, 180);

      if (slide.cta) {
        const bodyHeight = bodyLines.length * 16;
        doc.setFont("helvetica", "bolditalic");
        doc.setFontSize(11);
        doc.text(slide.cta, 64, 200 + bodyHeight);
      }
    });

    doc.save("repurpose-linkedin-carousel.pdf");
    setShowPdfToast(true);

    if (pdfToastTimeoutRef.current) {
      clearTimeout(pdfToastTimeoutRef.current);
    }
    pdfToastTimeoutRef.current = setTimeout(() => {
      setShowPdfToast(false);
    }, 2500);
  };

  const runRepurpose = async () => {
    setError(null);
    setResults(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("youtubeLink", youtubeLink);
      formData.append("rawText", rawText);
      formData.append("voiceText", voiceSamples.filter((sample) => sample.trim().length > 0).join("\n\n---\n\n"));

      if (sourceFile) {
        formData.append("sourceFile", sourceFile);
      }

      voiceFiles.forEach((file) => formData.append("voiceFiles", file));
      voiceSamples
        .map((sample) => sample.trim())
        .filter(Boolean)
        .forEach((sample, index) => {
          const sampleFile = new File([sample], `voice-sample-${index + 1}.txt`, { type: "text/plain" });
          formData.append("voiceFiles", sampleFile);
        });

      const response = await fetch("/api/repurpose", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Repurpose request failed.");
      }

      const payload = await response.json();
      setResults(payload.outputs as RepurposeResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="container max-w-5xl py-10 md:py-14">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">New Repurpose</h1>
        <p className="text-muted-foreground">
          Upload source content, lock your brand voice, and generate platform-ready assets.
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
        You have {Math.max(0, 10 - generationsUsed)} generations left this month.
      </div>

      <div className="space-y-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/30">
            <CardTitle className="text-xl">Upload Source Content</CardTitle>
            <CardDescription>YouTube link, audio file (MP3/WAV), PDF, or raw text.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6 md:p-8">
            <div
              className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
                isDraggingSource ? "border-primary bg-primary/5" : "border-border bg-muted/10"
              }`}
              onDrop={handleSourceDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingSource(true);
              }}
              onDragLeave={() => setIsDraggingSource(false)}
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-background">
                <FileUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">Drag and drop one source file</p>
              <p className="mt-1 text-sm text-muted-foreground">Accepted: MP3, WAV, PDF</p>
              <Input
                type="file"
                accept=".mp3,.wav,.pdf,audio/mpeg,audio/wav,application/pdf"
                className="mx-auto mt-4 max-w-sm"
                onChange={(event) => handleSourceFile(event.target.files)}
              />

              {sourcePreviewItems.length > 0 ? (
                <div className="mt-4 rounded-lg border border-border/60 bg-background p-3 text-left">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">Current source content</p>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={clearAllSource}>
                      Clear all
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {sourceFile ? (
                      <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">File</span>
                        <p className="mx-3 flex-1 truncate text-sm text-muted-foreground">{sourceFile.name}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={() => clearSourceItem("file")}
                          aria-label="Remove source file"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                    {youtubeLink.trim() ? (
                      <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">YouTube</span>
                        <p className="mx-3 flex-1 truncate text-sm text-muted-foreground">{youtubeLink.trim()}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={() => clearSourceItem("youtube")}
                          aria-label="Remove YouTube link"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                    {rawText.trim() ? (
                      <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                        <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium">Text</span>
                        <p className="mx-3 flex-1 truncate text-sm text-muted-foreground">
                          Text pasted ({rawText.trim().length} chars)
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={() => clearSourceItem("text")}
                          aria-label="Remove pasted text"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="youtubeLink">YouTube Link</Label>
                <Input
                  id="youtubeLink"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeLink}
                  onChange={(event) => setYoutubeLink(event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="rawText">Raw Text Paste</Label>
                <Textarea
                  id="rawText"
                  placeholder="Paste transcript, notes, or script..."
                  className="min-h-32"
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/30">
            <CardTitle className="text-xl">Voice Training</CardTitle>
            <CardDescription>Upload 3–5 past posts to lock in your brand voice.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6 md:p-8">
            <div className="space-y-2">
              <Label htmlFor="voiceFiles">Upload Voice Samples</Label>
              <Input
                id="voiceFiles"
                type="file"
                multiple
                accept=".txt,.md,.pdf,.mp3,.wav,audio/mpeg,audio/wav,application/pdf,text/plain,text/markdown"
                onChange={handleVoiceFiles}
              />
              {voiceFiles.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {voiceFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <p className="truncate pr-2 text-sm text-muted-foreground">{file.name}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        onClick={() => removeVoiceFile(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <Label>Voice Samples</Label>
              {voiceSamples.map((sample, index) => (
                <div key={`voice-sample-${index}`} className="rounded-lg border border-border/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Voice Sample {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      disabled={voiceSamples.length <= 3}
                      onClick={() => removeVoiceSample(index)}
                      aria-label={`Remove voice sample ${index + 1}`}
                    >
                      ×
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste one past post example..."
                    className="min-h-24"
                    value={sample}
                    onChange={(event) => updateVoiceSample(index, event.target.value)}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addVoiceSample}
                disabled={voiceSamples.length >= 5}
              >
                + Add another sample
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void saveVoice()} disabled={isVoiceBusy}>
                {isVoiceBusy ? "Saving..." : "Save My Voice"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void loadSavedVoice()} disabled={isVoiceBusy}>
                Load Saved Voice
              </Button>
            </div>
            {voiceMessage ? (
              <p className={`text-sm ${voiceReady ? "text-emerald-600" : "text-muted-foreground"}`}>{voiceMessage}</p>
            ) : null}
            {hasSavedVoice ? (
              <p className="text-xs text-emerald-600">Your saved voice profile is available for this account.</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Saved samples: {providedVoiceSampleCount} / 3 minimum
            </p>
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="h-14 w-full gap-2 text-base shadow-md"
          disabled={!canRepurpose}
          onClick={runRepurpose}
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          Repurpose This Content
        </Button>

        {error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : null}

        {results ? (
          <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 pb-2">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Your Repurposed Content</h2>
              <p className="text-muted-foreground text-lg">Review, copy, and download your platform-ready assets below.</p>
            </div>

            <div className="sticky top-4 z-40 -mx-4 md:mx-0 overflow-x-auto bg-background/80 backdrop-blur-md rounded-full border border-border/60 shadow-sm px-2 py-2 mb-8 hidden md:block">
              <nav className="flex items-center gap-1 min-w-max justify-center">
                {outputConfig.map((item) => (
                  <a
                    key={`nav-${item.key}`}
                    href={`#section-${item.key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(`section-${item.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-4 py-2 text-sm font-medium transition-all hover:bg-muted bg-transparent rounded-full text-foreground/70 hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
            
            <div className="sticky top-0 z-40 -mx-4 md:hidden overflow-x-auto bg-background border-y border-border/60 p-3 mb-8 shadow-sm">
              <nav className="flex items-center gap-2 min-w-max">
                {outputConfig.map((item) => (
                  <a
                    key={`nav-mobile-${item.key}`}
                    href={`#section-${item.key}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(`section-${item.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="px-4 py-1.5 text-sm font-medium transition-all hover:bg-muted bg-muted/30 rounded-full text-foreground/80 border border-border/40"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="space-y-12">
              {outputConfig.map((item) => (
                <section id={`section-${item.key}`} key={item.key} className="scroll-mt-24">
                  <Card className="border-border/60 shadow-md overflow-hidden border-t-4 border-t-primary/80">
                    <CardHeader className="border-b border-border/60 bg-muted/10 pb-5 pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <CardTitle className="text-2xl flex items-center gap-2 text-foreground/90 font-bold">
                          <span className="text-primary/60 text-xl font-mono mr-1">##</span> {item.label}
                        </CardTitle>
                      <div className="flex items-center gap-3">
                        {item.key === "linkedinCarousel" ? (
                          <Button variant="outline" className="gap-2 shadow-sm" onClick={downloadLinkedInCarouselPdf}>
                            <Download className="h-4 w-4" />
                            Download PDF
                          </Button>
                        ) : null}
                        <Button
                          variant={copiedOutputKey === item.key ? "default" : "outline"}
                          className={`shadow-sm ${copiedOutputKey === item.key ? "bg-emerald-600 text-white hover:bg-emerald-600/90" : ""}`}
                          onClick={() => copyOutput(item.key)}
                        >
                          {copiedOutputKey === item.key ? (
                            <>Copied</>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy All
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    {item.key === "linkedinCarousel" ? (
                      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {carouselSlides.map((slide) => (
                          <Card key={`slide-${slide.slideNumber}`} className="relative border-border/80 bg-gradient-to-br from-background to-muted/20 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/60 transition-colors" />
                            <CardHeader className="pb-4 border-b border-border/40 bg-muted/5 relative">
                              <div className="absolute top-4 right-4">
                                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold border border-primary/20 shadow-sm">
                                  {slide.slideNumber}
                                </span>
                              </div>
                              <CardDescription className="text-xs font-bold tracking-wider uppercase text-primary/70 mb-1">Slide</CardDescription>
                              <CardTitle className="text-xl leading-snug pr-8 font-semibold text-foreground/90">{slide.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 flex-1 flex flex-col pt-5 px-6 pb-6">
                              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground flex-1 font-medium">{slide.body}</div>
                              {slide.cta ? (
                                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 p-3.5 flex items-start gap-2.5">
                                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                  <p className="text-sm font-semibold text-primary/90 leading-snug">{slide.cta}</p>
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : item.key === "emailSequence" ? (
                      <div className="grid gap-6">
                        {emailSequenceEmails.map((email) => (
                          <Card key={`email-${email.emailNumber}`} className="border-border/70 bg-background shadow-sm hover:border-primary/30 transition-colors">
                            <CardHeader className="pb-4 border-b border-border/50 bg-muted/5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div>
                                <span className="text-xs font-bold tracking-wider uppercase text-primary/80 mb-2 block">Email {email.emailNumber}</span>
                                <CardTitle className="text-lg leading-snug font-bold">
                                  <span className="text-muted-foreground font-normal mr-2">Subject:</span>
                                  {email.subject}
                                </CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8">
                              <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/80 font-medium max-w-3xl">{email.body}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed text-[15px] text-foreground/90 font-medium bg-muted/10 p-6 rounded-xl border border-border/40">
                          {results[item.key] as string}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm">
          <Card className="mx-4 w-full max-w-xl border-border/60 shadow-xl">
            <CardContent className="space-y-6 p-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing your voice and repurposing content... (usually takes 30-60 seconds)
                </p>
              </div>
              <div className="space-y-3">
                {loadingSteps.map((step, index) => {
                  const isDone = index < loadingStepIndex;
                  const isActive = index === loadingStepIndex;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          isDone ? "bg-emerald-500" : isActive ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                      />
                      <p className={`text-sm ${isDone || isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {step}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {showPdfToast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-lg">
          PDF downloaded successfully
        </div>
      ) : null}
    </section>
  );
}
