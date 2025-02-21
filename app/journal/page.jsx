"use client";

import { useState, useEffect, useRef } from "react";
import Nav from "../nav/Nav";

export default function JournalPage() {
  const [title, setTitle] = useState("Journal Entry");
  const [content, setContent] = useState("");
  const contentRef = useRef(null);

  // Load saved title and content on mount.
  useEffect(() => {
    const savedTitle = localStorage.getItem("journalTitle");
    const savedContent = localStorage.getItem("journalContent");
    if (savedTitle) setTitle(savedTitle);
    if (savedContent) setContent(savedContent);
  }, []);

  // Save title whenever it changes.
  useEffect(() => {
    localStorage.setItem("journalTitle", title);
  }, [title]);

  // Save content whenever it changes.
  useEffect(() => {
    localStorage.setItem("journalContent", content);
  }, [content]);

  const handleTitleChange = (e) => setTitle(e.target.value);
  const handleContentInput = (e) => setContent(e.currentTarget.innerHTML);

  return (
    <>
    <Nav /> 
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white shadow rounded p-6">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Title..."
          className="w-full text-4xl font-bold mb-6 border-b border-gray-300 focus:outline-none focus:border-blue-500"
        />
        {/* Content Editable Area */}
        <div
          ref={contentRef}
          contentEditable
          onInput={handleContentInput}
          className="prose prose-lg focus:outline-none"
          suppressContentEditableWarning={true}
        >
          {content || <p>Start writing your journal entry...</p>}
        </div>
      </div>
    </div>
    </>
  );
}
