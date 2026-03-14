/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  Image as ImageIcon, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Camera,
  Grid,
  Sparkles,
  Clipboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PASSPORT_PROMPT = `
Create a professional 6x4 inch (landscape) passport photo sheet. 
The sheet must contain exactly 8 identical copies of the person from the reference image.
LAYOUT: Arrange the 8 photos in a 2x4 grid (2 rows and 4 columns).
FULL FILL: Each individual photo must be as LARGE as possible to completely fill the 6x4 sheet area with NO extra white space or large margins. 
BACKGROUND: Replace the original background with a solid professional solid BLUE color.
IDENTITY: Strictly preserve the person's face shape, features, and expression. No face morphing.
LIGHTING: Even studio lighting, Sony A1 quality, sharp focus.
DETAILS: Add a thin black border around each photo for cutting.
The final output must be a single high-resolution 6x4 print-ready image.
`;

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                setSourceImage(event.target?.result as string);
                setGeneratedImage(null);
                setError(null);
              };
              reader.readAsDataURL(blob);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePassportPhotos = async () => {
    if (!sourceImage) return;

    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-2.5-flash-image";

      const base64Data = sourceImage.split(',')[1];
      const mimeType = sourceImage.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: PASSPORT_PROMPT,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:2", // 6x4 is 3:2
          }
        }
      });

      const candidate = response.candidates?.[0];
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`AI ने इमेज जनरेट करने से मना कर दिया (कारण: ${candidate.finishReason})। कृपया दूसरी फोटो आज़माएं।`);
      }

      let foundImage = false;
      let textFeedback = "";

      for (const part of candidate?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/jpeg;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        } else if (part.text) {
          textFeedback += part.text;
        }
      }

      if (!foundImage) {
        if (textFeedback) {
          throw new Error(`AI फीडबैक: ${textFeedback}`);
        }
        throw new Error("इमेज जनरेट नहीं हो सकी। कृपया स्पष्ट फोटो के साथ पुनः प्रयास करें या लाइटिंग बेहतर करें।");
      }

    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "जनरेशन के दौरान एक त्रुटि हुई।");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'passport photo 1.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Camera className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-blue-600">Shiv Photo AI</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <span>6x4 शीट स्पेशलिस्ट</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-10">
          
          {/* Left Column */}
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-2">प्रोफेशनल पासपोर्ट शीट जनरेटर</h2>
              <p className="text-neutral-500 text-sm leading-relaxed">
                अपनी फोटो अपलोड करें या <span className="font-bold text-blue-600">Ctrl + V</span> दबाकर पेस्ट करें। 
                हम ऑटोमैटिकली नीले बैकग्राउंड के साथ 6x4 की 8-फोटो शीट तैयार कर देंगे।
              </p>
            </section>

            <div className="space-y-4">
              {/* Upload Area */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative group cursor-pointer border-2 border-dashed rounded-2xl p-10 transition-all duration-300
                  ${sourceImage ? 'border-blue-200 bg-blue-50/30' : 'border-neutral-200 bg-white hover:border-blue-400 hover:bg-neutral-50'}
                `}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  {sourceImage ? (
                    <div className="relative">
                      <img 
                        src={sourceImage} 
                        alt="Source" 
                        className="w-28 h-28 object-cover rounded-xl shadow-sm border-2 border-white"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-full shadow-lg">
                        <CheckCircle2 size={14} />
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                      <Upload className="text-neutral-400" size={24} />
                    </div>
                  )}
                  
                  <div>
                    <p className="font-bold text-neutral-800">
                      {sourceImage ? 'फोटो लोड हो गई' : 'फोटो अपलोड करें'}
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-widest font-bold">
                      या यहाँ पेस्ट करें (CTRL + V)
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={!sourceImage || isGenerating}
                onClick={generatePassportPhotos}
                className={`
                  w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-300
                  ${!sourceImage || isGenerating 
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-[0.98]'}
                `}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    शीट तैयार हो रही है...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    6x4 शीट जनरेट करें
                  </>
                )}
              </button>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 text-xs"
                  >
                    <AlertCircle className="shrink-0 mt-0.5" size={16} />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Layout Info */}
            <div className="bg-neutral-50 rounded-2xl p-5 space-y-3 border border-neutral-100">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">लेआउट जानकारी</h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-neutral-600">
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                  ग्रिड: 2 पंक्तियाँ x 4 कॉलम (8 फोटो)
                </li>
                <li className="flex items-center gap-2 text-xs text-neutral-600">
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                  पेपर साइज: 6x4 इंच (फोटो लैब रेडी)
                </li>
                <li className="flex items-center gap-2 text-xs text-neutral-600">
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                  बैकग्राउंड: अनिवार्य नीला (Blue)
                </li>
                <li className="flex items-center gap-2 text-xs text-neutral-600">
                  <div className="w-1 h-1 rounded-full bg-blue-600" />
                  बॉर्डर: कटिंग के लिए ब्लैक लाइन
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column */}
          <div className="relative">
            <div className="sticky top-24">
              <div className="aspect-[3/2] bg-white rounded-2xl border border-neutral-100 shadow-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/30">
                  <div className="flex items-center gap-2">
                    <Grid size={16} className="text-blue-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">शीट प्रीव्यू (6x4)</span>
                  </div>
                  {generatedImage && (
                    <button 
                      onClick={downloadImage}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                      title="डाउनलोड करें"
                    >
                      <Download size={18} />
                    </button>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center p-4 bg-neutral-50/50">
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.div 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-3 text-center"
                      >
                        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-xs font-bold text-neutral-500">प्रोसेसिंग...</p>
                      </motion.div>
                    ) : generatedImage ? (
                      <motion.div 
                        key="result"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full h-full flex flex-col items-center justify-center gap-4"
                      >
                        <img 
                          src={generatedImage} 
                          alt="Generated Sheet" 
                          className="max-w-full max-h-full object-contain shadow-lg border border-neutral-200"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={downloadImage}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
                        >
                          <Download size={16} />
                          डाउनलोड JPG
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-3 text-neutral-300"
                      >
                        <Clipboard size={48} strokeWidth={1} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">यहाँ शीट दिखाई देगी</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-neutral-200" />
                  300 DPI
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-neutral-200" />
                  FULL FILL
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-neutral-200" />
                  JPEG FORMAT
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-10 border-t border-neutral-50">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            © 2026 Shiv Photo AI | 6x4 पासपोर्ट स्पेशलिस्ट
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-blue-600 transition-colors">प्राइवेसी</a>
            <a href="#" className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-blue-600 transition-colors">नियम</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
