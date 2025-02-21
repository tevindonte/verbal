"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios"; 
import debounce from "lodash.debounce";
import Nav from "../nav/Nav";

export default function Moodboard() {
  const canvasRef = useRef(null);
  const [fabricState, setFabricState] = useState(null);
  const [currentTool, setCurrentTool] = useState("select");
  const currentToolRef = useRef(currentTool);

  // Popups for pen, shapes
  const [penOptionsOpen, setPenOptionsOpen] = useState(false);
  const [shapesDropdownOpen, setShapesDropdownOpen] = useState(false);

  // Track text selection
  const [selectedText, setSelectedText] = useState(null);

  // Zoom
  const [zoom, setZoom] = useState(1);

  // --------------- DRAGGABLE TOOLBAR (BOTTOM LEFT, HORIZONTAL) ---------------
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 20 });
  const toolbarRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0, top: 0, left: 0 });
  const isDragging = useRef(false);

  useEffect(() => {
    // Position the toolbar near bottom-left by default
    const bottomOffset = 20;
    const toolbarHeight = 60;
    const top = window.innerHeight - bottomOffset - toolbarHeight;
    setToolbarPos({ top, left: 20 });
  }, []);

  const handleToolbarMouseDown = (e) => {
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      top: toolbarPos.top,
      left: toolbarPos.left,
    };
  };
  const handleToolbarMouseMove = (e) => {
    if (isDragging.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setToolbarPos({
        top: dragStart.current.top + dy,
        left: dragStart.current.left + dx,
      });
    }
  };
  const handleToolbarMouseUp = () => {
    isDragging.current = false;
  };

  // --------------- SIDE PANELS (PINTEREST, GOOGLE, UNSPLASH) ---------------
  const [showPinterestPanel, setShowPinterestPanel] = useState(false);
  const [pinterestUrl, setPinterestUrl] = useState("");
  const [embedType, setEmbedType] = useState("board");

  const [showGooglePanel, setShowGooglePanel] = useState(false);
  const [googleQuery, setGoogleQuery] = useState("");
  const [googleResults, setGoogleResults] = useState([]);

  const [showUnsplashPanel, setShowUnsplashPanel] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState([]);

  const sidePanelOpen = showPinterestPanel || showGooglePanel || showUnsplashPanel;

  // Load Pinterest Script once
  useEffect(() => {
    if (!document.querySelector('script[src="//assets.pinterest.com/js/pinit.js"]')) {
      const script = document.createElement("script");
      script.src = "//assets.pinterest.com/js/pinit.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.PinUtils) {
          window.PinUtils.build();
        }
      };
    }
  }, []);

  // Rebuild Pinterest embed if panel is open & URL changes
  useEffect(() => {
    if (showPinterestPanel && pinterestUrl && window.PinUtils) {
      window.PinUtils.build();
    }
  }, [showPinterestPanel, pinterestUrl, embedType]);

  // --------------- GOOGLE / UNSPLASH SEARCH ---------------
  const searchGoogleImages = async () => {
    if (!googleQuery) return;
    try {
      const response = await axios.get("/api/google-images", {
        params: { q: googleQuery },
      });
      setGoogleResults(response.data.items || []);
    } catch (error) {
      console.error("Error searching Google images:", error);
    }
  };

  const searchUnsplashImages = async () => {
    if (!unsplashQuery) return;
    try {
      const response = await axios.get("/api/unsplash-photos", {
        params: { query: unsplashQuery },
      });
      setUnsplashResults(response.data.results || []);
    } catch (error) {
      console.error("Error searching Unsplash images:", error);
    }
  };

  // --------------- FABRIC INIT ---------------
  useEffect(() => {
    async function initCanvas() {
      try {
        const fabricModule = await import("fabric");
        const {
          Canvas,
          IText,
          Point,
          Rect,
          Circle,
          PencilBrush,
          Line,
          Triangle,
          Textbox,
          Group,
          Image
        } = fabricModule;

        if (!Canvas) throw new Error("Canvas is undefined in Fabric module");

        const canvas = new Canvas(canvasRef.current, {
          backgroundColor: "transparent",
        });

        const virtualWidth = 3000;
        const virtualHeight = 3000;
        canvas.setWidth(virtualWidth);
        canvas.setHeight(virtualHeight);

        const initialZoom = 1;
        canvas.setViewportTransform([
          initialZoom,
          0,
          0,
          initialZoom,
          -(virtualWidth - window.innerWidth) / 2,
          -(virtualHeight - window.innerHeight) / 2,
        ]);
        setZoom(initialZoom);

        canvas.requestRenderAll();

        // Mouse wheel zoom
        canvas.on("mouse:wheel", function (opt) {
          const delta = opt.e.deltaY;
          let currentZoom = canvas.getZoom();
          currentZoom *= 0.999 ** delta;
          if (currentZoom > 5) currentZoom = 5;
          if (currentZoom < 0.5) currentZoom = 0.5;
          canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, currentZoom);
          setZoom(currentZoom);
          opt.e.preventDefault();
          opt.e.stopPropagation();
        });

        // Panning
        let isPanning = false;
        canvas.on("mouse:down", function () {
          if (currentToolRef.current === "pan") {
            isPanning = true;
            canvas.defaultCursor = "grab";
          }
        });
        canvas.on("mouse:move", function (opt) {
          if (isPanning && currentToolRef.current === "pan") {
            const e = opt.e;
            const delta = new Point(e.movementX, e.movementY);
            canvas.relativePan(delta);
          }
        });
        canvas.on("mouse:up", function () {
          if (isPanning && currentToolRef.current === "pan") {
            isPanning = false;
            canvas.defaultCursor = "default";
          }
        });

        // Disable free draw by default
        canvas.isDrawingMode = false;

        // Track selected text
        const updateSelection = (opt) => {
          if (
            opt.selected &&
            opt.selected.length === 1 &&
            opt.selected[0].type === "i-text"
          ) {
            setSelectedText(opt.selected[0]);
          } else {
            setSelectedText(null);
          }
        };
        canvas.on("selection:created", updateSelection);
        canvas.on("selection:updated", updateSelection);
        canvas.on("selection:cleared", () => setSelectedText(null));

        // 1) We'll store references in state
        setFabricState({
          canvas,
          IText,
          Rect,
          Circle,
          PencilBrush,
          Point,
          Line,
          Triangle,
          Textbox,
          Group,
          Image
        });
      } catch (error) {
        console.error("Error initializing Fabric canvas:", error);
      }
    }
    initCanvas();
  }, []);

  // Keep currentToolRef updated
  useEffect(() => {
    currentToolRef.current = currentTool;
  }, [currentTool]);

  // --------------- UNDO / REDO / CLEAR ---------------
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Helper to save the current canvas state
  const saveHistorySnapshot = useCallback((canvas) => {
    const json = canvas.toJSON();
    setHistory((prev) => [...prev, json]);
    // Clear redo once we add a new history snapshot
    setRedoStack([]);
  }, []);

  // On object add/modify, save a snapshot
  useEffect(() => {
    if (!fabricState) return;
    const { canvas } = fabricState;

    const handleObjectModified = () => saveHistorySnapshot(canvas);
    const handleObjectAdded = () => saveHistorySnapshot(canvas);

    // Listen
    canvas.on("object:modified", handleObjectModified);
    canvas.on("object:added", handleObjectAdded);

    // Create initial blank snapshot
    saveHistorySnapshot(canvas);

    return () => {
      canvas.off("object:modified", handleObjectModified);
      canvas.off("object:added", handleObjectAdded);
    };
  }, [fabricState, saveHistorySnapshot]);

  const undo = () => {
    if (!fabricState) return;
    if (history.length <= 1) return; // nothing to undo

    const { canvas } = fabricState;
    setHistory((prev) => {
      const newHistory = [...prev];
      const popped = newHistory.pop(); // current state
      setRedoStack((r) => [...r, popped]);

      const previous = newHistory[newHistory.length - 1];
      canvas.loadFromJSON(previous, () => canvas.renderAll());
      return newHistory;
    });
  };

  const redo = () => {
    if (!fabricState) return;
    if (redoStack.length < 1) return;

    const { canvas } = fabricState;
    setRedoStack((prev) => {
      const newRedo = [...prev];
      const popped = newRedo.pop(); // state to reapply
      setHistory((h) => {
        const newHistory = [...h, popped];
        canvas.loadFromJSON(popped, () => canvas.renderAll());
        return newHistory;
      });
      return newRedo;
    });
  };

  const clearCanvas = () => {
    if (!fabricState) return;
    const { canvas } = fabricState;
    // Save current before clearing
    saveHistorySnapshot(canvas);

    canvas.clear();
  };

  // --------------- MAIN TOOL HANDLERS ---------------
  const selectTool = () => {
    if (!fabricState) return;
    fabricState.canvas.isDrawingMode = false;
    fabricState.canvas.defaultCursor = "default";
    setCurrentTool("select");
    setPenOptionsOpen(false);
  };

  const panTool = () => {
    if (!fabricState) return;
    fabricState.canvas.isDrawingMode = false;
    fabricState.canvas.defaultCursor = "grab";
    setCurrentTool("pan");
    setPenOptionsOpen(false);
  };

  const togglePenOptions = () => {
    if (!fabricState) return;
    if (currentToolRef.current === "pen") {
      setPenOptionsOpen(!penOptionsOpen);
    } else {
      // Switch to pen
      fabricState.canvas.isDrawingMode = true;
      fabricState.canvas.freeDrawingBrush = new fabricState.PencilBrush(fabricState.canvas);
      fabricState.canvas.freeDrawingBrush.color = "#000000";
      fabricState.canvas.freeDrawingBrush.width = 3;
      fabricState.canvas.defaultCursor = "crosshair";
      setCurrentTool("pen");
      setPenOptionsOpen(true);
    }
  };

  const setPenOption = (option) => {
    if (!fabricState) return;
    const { canvas, PencilBrush } = fabricState;
    canvas.isDrawingMode = true;
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.opacity = 1;

    switch (option) {
      case "pen":
        canvas.freeDrawingBrush.color = "#000000";
        canvas.freeDrawingBrush.width = 3;
        canvas.freeDrawingBrush.globalCompositeOperation = "source-over";
        break;
      case "marker":
        canvas.freeDrawingBrush.color = "#0000ff";
        canvas.freeDrawingBrush.width = 10;
        canvas.freeDrawingBrush.globalCompositeOperation = "source-over";
        break;
      case "highlighter":
        canvas.freeDrawingBrush.color = "#ffff00";
        canvas.freeDrawingBrush.width = 20;
        canvas.freeDrawingBrush.globalCompositeOperation = "source-over";
        canvas.freeDrawingBrush.opacity = 0.3;
        break;
      case "eraser":
        canvas.freeDrawingBrush.color = "#ffffff";
        canvas.freeDrawingBrush.width = 20;
        canvas.freeDrawingBrush.globalCompositeOperation = "destination-out";
        break;
      default:
        break;
    }
    setPenOptionsOpen(false);
  };

  const addText = () => {
    if (!fabricState) return;
    const { canvas, IText } = fabricState;
    const center = canvas.getCenter();
    const text = new IText("Edit me", {
      left: center.left,
      top: center.top,
      fill: "#333333",
      fontSize: 24,
    });
    canvas.add(text);
    canvas.requestRenderAll();
  };

  const addShape = (shapeType) => {
    if (!fabricState) return;
    const { canvas, Rect, Circle } = fabricState;
    const center = canvas.getCenter();
    let shape;
    switch (shapeType) {
      case "rectangle":
        shape = new Rect({
          left: center.left - 50,
          top: center.top - 25,
          width: 100,
          height: 50,
          fill: "#00aaff",
          stroke: "#000000",
          strokeWidth: 2,
        });
        break;
      case "square":
        shape = new Rect({
          left: center.left - 50,
          top: center.top - 50,
          width: 100,
          height: 100,
          fill: "#00cc66",
          stroke: "#000000",
          strokeWidth: 2,
        });
        break;
      case "circle":
        shape = new Circle({
          left: center.left - 50,
          top: center.top - 50,
          radius: 50,
          fill: "#ffcc00",
          stroke: "#000000",
          strokeWidth: 2,
        });
        break;
      default:
        return;
    }
    canvas.add(shape);
    canvas.requestRenderAll();
    setShapesDropdownOpen(false);
    setCurrentTool("select");
  };

  // --------------- TEXT FORMATTING ---------------
  const toggleBold = () => {
    if (!selectedText) return;
    selectedText.set(
      "fontWeight",
      selectedText.fontWeight === "bold" ? "normal" : "bold"
    );
    fabricState.canvas.requestRenderAll();
  };

  const changeTextColor = (e) => {
    if (!selectedText) return;
    selectedText.set("fill", e.target.value);
    fabricState.canvas.requestRenderAll();
  };

  const changeTextBackgroundColor = (e) => {
    if (!selectedText) return;
    selectedText.set("backgroundColor", e.target.value);
    fabricState.canvas.requestRenderAll();
  };

  // --------------- ZOOM ---------------
  const zoomIn = () => {
    if (!fabricState) return;
    const { canvas } = fabricState;
    let newZoom = canvas.getZoom() * 1.1;
    if (newZoom > 5) newZoom = 5;
    canvas.zoomToPoint({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, newZoom);
    setZoom(newZoom);
  };
  const zoomOut = () => {
    if (!fabricState) return;
    const { canvas } = fabricState;
    let newZoom = canvas.getZoom() / 1.1;
    if (newZoom < 0.5) newZoom = 0.5;
    canvas.zoomToPoint({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, newZoom);
    setZoom(newZoom);
  };
  const resetZoom = () => {
    if (!fabricState) return;
    const { canvas } = fabricState;
    const initialZoom = 1;
    canvas.zoomToPoint({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, initialZoom);
    setZoom(initialZoom);
  };

  // --------------- ARROWS & NOTES ---------------
  const [arrowMode, setArrowMode] = useState(false);
  const [arrowFromObject, setArrowFromObject] = useState(null);

  const addArrow = () => {
    setArrowMode(true);
    setArrowFromObject(null);
    selectTool(); // force select mode so user can pick objects
  };

  useEffect(() => {
    if (!fabricState) return;
    const { canvas } = fabricState;

    const handleArrowObjectSelect = (opt) => {
      if (!arrowMode) return;
      if (!opt.selected || opt.selected.length === 0) return;
      const obj = opt.selected[0];
      if (!arrowFromObject) {
        setArrowFromObject(obj);
      } else {
        if (obj === arrowFromObject) {
          setArrowMode(false);
          setArrowFromObject(null);
          return;
        }
        createConnector(arrowFromObject, obj);
        setArrowMode(false);
        setArrowFromObject(null);
      }
    };

    canvas.on("selection:created", handleArrowObjectSelect);
    return () => {
      canvas.off("selection:created", handleArrowObjectSelect);
    };
  }, [arrowMode, arrowFromObject, fabricState]);

  const createConnector = (fromObj, toObj) => {
    if (!fabricState) return;
    const { canvas, Line, Triangle } = fabricState;

    const fromCenter = fromObj.getCenterPoint();
    const toCenter = toObj.getCenterPoint();

    const line = new Line([fromCenter.x, fromCenter.y, toCenter.x, toCenter.y], {
      stroke: "black",
      strokeWidth: 2,
      hasControls: false,
      selectable: false,
      originX: "center",
      originY: "center",
    });
    line.fromObject = fromObj;
    line.toObject = toObj;
    canvas.add(line);

    const arrowHead = new Triangle({
      left: toCenter.x,
      top: toCenter.y,
      originX: "center",
      originY: "center",
      width: 12,
      height: 12,
      angle: 90,
      fill: "black",
      selectable: false,
    });
    arrowHead.lineParent = line;
    arrowHead.fromObject = fromObj;
    arrowHead.toObject = toObj;
    canvas.add(arrowHead);

    const updateConnectorPositions = () => {
      const fCenter = fromObj.getCenterPoint();
      const tCenter = toObj.getCenterPoint();
      line.set({ x1: fCenter.x, y1: fCenter.y, x2: tCenter.x, y2: tCenter.y });
      line.setCoords();

      arrowHead.set({ left: tCenter.x, top: tCenter.y });
      const angle =
        (Math.atan2(tCenter.y - fCenter.y, tCenter.x - fCenter.x) * 180) /
        Math.PI;
      arrowHead.set({ angle: angle + 90 });
      arrowHead.setCoords();

      canvas.requestRenderAll();
    };

    // Listen for movement
    fromObj.on("moving", updateConnectorPositions);
    toObj.on("moving", updateConnectorPositions);
    fromObj.on("modified", updateConnectorPositions);
    toObj.on("modified", updateConnectorPositions);

    updateConnectorPositions();
  };

  const addNote = () => {
    if (!fabricState) return;
    const { canvas, Rect, Textbox, Group } = fabricState;
    const center = canvas.getCenter();

    const noteRect = new Rect({
      left: center.left,
      top: center.top,
      width: 140,
      height: 100,
      fill: "#fff8a7", 
      stroke: "#cccccc",
      strokeWidth: 1,
      rx: 5,
      ry: 5,
      shadow: "2px 2px 5px rgba(0,0,0,0.2)",
    });

    const noteLabel = new Textbox("Note...", {
      left: center.left + 10,
      top: center.top + 10,
      width: 120,
      fontSize: 14,
      fill: "#333",
      editable: true,
      fontFamily: "Helvetica",
    });

    const noteGroup = new Group([noteRect, noteLabel], {
      left: center.left,
      top: center.top,
      selectable: true,
    });

    canvas.add(noteGroup);
    canvas.requestRenderAll();
  };

  // --------------- ADDING LOCAL IMAGES ---------------
  const fileInputRef = useRef(null);

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null; // reset
      fileInputRef.current.click();
    }
  };

  // The approach from the snippet: read as dataURL, then create an HTMLImage
  const handleFileChange = (e) => {
    if (!fabricState) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result;
      if (!dataUrl) return;

      // 1) Create a plain <img> element
      const imageElement = document.createElement("img");
      imageElement.src = dataUrl;

      // 2) Once it loads, convert to fabric.Image
      imageElement.onload = () => {
        const { canvas, Image } = fabricState;

        // create a Fabric image from the HTMLImage
        const imgInstance = new Image(imageElement, {
          left: canvas.getCenter().left, 
          top: canvas.getCenter().top,
          // You can set additional props if you like
        });

        // Optionally scale the image if it's large
        const maxWidth = canvas.getWidth() - 200; 
        const maxHeight = canvas.getHeight() - 200;

        // If the image is bigger than the canvas minus some margin, scale
        const scaleX = maxWidth / imageElement.width;
        const scaleY = maxHeight / imageElement.height;
        const scale = Math.min(scaleX, scaleY, 1); // never scale up beyond 1:1

        imgInstance.scale(scale);

        // Add to canvas & center
        canvas.add(imgInstance);
        canvas.renderAll();
      };
    };
    reader.readAsDataURL(file);
  };

  // --------------- RENDER ---------------
  return (
    <>
    <Nav />
    <div className="relative w-full h-screen bg-[#f0f0f0] select-none">

      {/* 1) LEFT SIDEBAR: Pinterest/Google/Unsplash toggles */}
      <div className="absolute top-4 left-4 z-50 bg-white p-2 rounded shadow">
        <button
          onClick={() => {
            setShowPinterestPanel((prev) => !prev);
            if (!showPinterestPanel) {
              setShowGooglePanel(false);
              setShowUnsplashPanel(false);
            }
          }}
          className="block w-full mb-2 px-3 py-1 text-sm rounded bg-pink-500 text-white"
        >
          {showPinterestPanel ? "Close Pinterest" : "Open Pinterest"}
        </button>

        <button
          onClick={() => {
            setShowGooglePanel((prev) => !prev);
            if (!showGooglePanel) {
              setShowPinterestPanel(false);
              setShowUnsplashPanel(false);
            }
          }}
          className="block w-full mb-2 px-3 py-1 text-sm rounded bg-indigo-500 text-white"
        >
          {showGooglePanel ? "Close Google" : "Open Google"}
        </button>

        <button
          onClick={() => {
            setShowUnsplashPanel((prev) => !prev);
            if (!showUnsplashPanel) {
              setShowPinterestPanel(false);
              setShowGooglePanel(false);
            }
          }}
          className="block w-full mb-2 px-3 py-1 text-sm rounded bg-green-600 text-white"
        >
          {showUnsplashPanel ? "Close Unsplash" : "Open Unsplash"}
        </button>
      </div>

      {/* 2) UNDO / REDO / CLEAR bar (top-left, below toggles) */}
      <div className="absolute top-36 left-4 z-50 bg-white p-2 rounded shadow flex gap-2">
        <button onClick={undo} className="px-3 py-1 bg-gray-300 rounded">
          Undo
        </button>
        <button onClick={redo} className="px-3 py-1 bg-gray-300 rounded">
          Redo
        </button>
        <button onClick={clearCanvas} className="px-3 py-1 bg-red-500 text-white rounded">
          Clear
        </button>
      </div>

      {/* 3) DRAGGABLE MAIN TOOLBAR (bottom-left, horizontal) */}
      <div
        ref={toolbarRef}
        style={{ position: "absolute", top: toolbarPos.top, left: toolbarPos.left }}
        className="z-40 bg-white p-2 rounded shadow cursor-move"
        onMouseDown={handleToolbarMouseDown}
        onMouseMove={handleToolbarMouseMove}
        onMouseUp={handleToolbarMouseUp}
        onMouseLeave={handleToolbarMouseUp}
      >
        <div className="flex flex-row gap-2 items-center">
          <button
            onClick={selectTool}
            className={`px-3 py-1 rounded border ${
              currentTool === "select" ? "bg-blue-500 text-white" : "bg-white text-black"
            }`}
          >
            Select
          </button>
          <button
            onClick={panTool}
            className={`px-3 py-1 rounded border ${
              currentTool === "pan" ? "bg-blue-500 text-white" : "bg-white text-black"
            }`}
          >
            Grab
          </button>

          {/* Pen with sub-options */}
          <div className="relative">
            <button
              onClick={togglePenOptions}
              className={`px-6 py-1 rounded border ${
                currentTool === "pen" ? "bg-blue-500 text-white" : "bg-white text-black"
              }`}
            >
              Pen ▾
            </button>
            {penOptionsOpen && (
              <div className="absolute bottom-full mb-1 left-0 w-40 rounded-md bg-white shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => setPenOption("pen")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Pen
                  </button>
                  <button
                    onClick={() => setPenOption("marker")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Marker
                  </button>
                  <button
                    onClick={() => setPenOption("highlighter")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Highlighter
                  </button>
                  <button
                    onClick={() => setPenOption("eraser")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Eraser
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={addText} className="px-3 py-1 rounded border bg-white text-black">
            Text
          </button>

          {/* Shapes */}
          <div className="relative">
            <button
              onClick={() => setShapesDropdownOpen(!shapesDropdownOpen)}
              className="px-3 py-1 rounded border bg-white text-black"
            >
              Shapes ▾
            </button>
            {shapesDropdownOpen && (
              <div className="absolute bottom-full mb-1 left-0 w-40 rounded-md bg-white shadow-lg z-50">
                <div className="py-1">
                  <button
                    onClick={() => addShape("rectangle")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Rectangle
                  </button>
                  <button
                    onClick={() => addShape("square")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Square
                  </button>
                  <button
                    onClick={() => addShape("circle")}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Circle
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={addArrow} className="px-3 py-1 rounded border bg-white text-black">
            Arrow
          </button>
          <button onClick={addNote} className="px-3 py-1 rounded border bg-white text-black">
            Note
          </button>

          {/* Upload local file => hidden input */}
          <button
            onClick={openFileDialog}
            className="px-3 py-1 rounded border bg-white text-black"
          >
            Upload Image
          </button>
        </div>
      </div>

      {/* Hidden file input for local images */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 4) ZOOM (bottom-right) */}
      <div className="absolute bottom-4 right-4 z-40 bg-white p-2 rounded shadow flex gap-2">
        <button onClick={zoomIn} className="px-3 py-1 rounded border bg-green-500 text-white">
          Zoom In
        </button>
        <button onClick={zoomOut} className="px-3 py-1 rounded border bg-green-500 text-white">
          Zoom Out
        </button>
        <button onClick={resetZoom} className="px-3 py-1 rounded border bg-yellow-500 text-white">
          Reset Zoom
        </button>
        <div className="flex items-center text-sm text-gray-600">
          Zoom: {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      {/* 5) TEXT FORMATTING (if text selected) */}
      {selectedText && (
        <div className="absolute top-20 left-4 z-50 bg-white p-2 rounded shadow flex gap-2">
          <button onClick={toggleBold} className="px-3 py-1 rounded border bg-purple-500 text-white">
            Bold
          </button>
          <label className="flex items-center gap-1">
            Color:
            <input type="color" onChange={changeTextColor} />
          </label>
          <label className="flex items-center gap-1">
            BG:
            <input type="color" onChange={changeTextBackgroundColor} />
          </label>
        </div>
      )}

      {/* 6) FABRIC CANVAS */}
      <div className="w-full h-full">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* 7) RIGHT SIDE DRAWER (Pinterest/Google/Unsplash) */}
      <div
        className={`fixed top-0 right-0 z-50 w-80 h-screen border-l border-gray-300 bg-white p-4 overflow-y-auto shadow transition-transform duration-300 ${
          sidePanelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* PINTEREST */}
        {showPinterestPanel && (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Pinterest {embedType === "board" ? "Board" : "Profile"} Embed
            </h3>
            <label className="block mb-2">
              <span className="mr-2 font-medium text-sm text-gray-700">Embed Type:</span>
              <select
                value={embedType}
                onChange={(e) => setEmbedType(e.target.value)}
                className="border p-1 text-sm rounded"
              >
                <option value="board">Board</option>
                <option value="profile">Profile</option>
              </select>
            </label>
            <input
              type="text"
              placeholder={
                embedType === "board"
                  ? "Enter your Pinterest board URL"
                  : "Enter your Pinterest profile URL"
              }
              className="border p-1 w-full mb-2"
              value={pinterestUrl}
              onChange={(e) => setPinterestUrl(e.target.value)}
            />
            {pinterestUrl && (
              <div key={pinterestUrl} className="my-4">
                {embedType === "board" ? (
                  <a
                    data-pin-do="embedBoard"
                    data-pin-board-width="405"
                    data-pin-scale-height="900"
                    data-pin-scale-width="190"
                    href={pinterestUrl}
                  >
                    Loading Pinterest board...
                  </a>
                ) : (
                  <a
                    data-pin-do="embedUser"
                    data-pin-board-width="400"
                    data-pin-scale-height="240"
                    data-pin-scale-width="80"
                    href={pinterestUrl}
                  >
                    Loading Pinterest profile...
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* GOOGLE */}
        {showGooglePanel && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Google Reuse Image Search</h3>
            <input
              type="text"
              placeholder="Enter search query..."
              className="border p-1 w-full mb-2"
              value={googleQuery}
              onChange={(e) => setGoogleQuery(e.target.value)}
            />
            <button
              onClick={searchGoogleImages}
              className="px-3 py-1 bg-blue-500 text-white rounded mb-4"
            >
              Search
            </button>
            <div>
              {googleResults && googleResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {googleResults.map((result) => (
                    <div key={result.link} className="border p-1">
                      <img src={result.link} alt={result.title} className="w-full h-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <p>No results found.</p>
              )}
            </div>
          </div>
        )}

        {/* UNSPLASH */}
        {showUnsplashPanel && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Unsplash Stock Images</h3>
            <input
              type="text"
              placeholder="Enter search query..."
              className="border p-1 w-full mb-2"
              value={unsplashQuery}
              onChange={(e) => setUnsplashQuery(e.target.value)}
            />
            <button
              onClick={searchUnsplashImages}
              className="px-3 py-1 bg-blue-500 text-white rounded mb-4"
            >
              Search
            </button>
            <div>
              {unsplashResults && unsplashResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {unsplashResults.map((photo) => (
                    <div key={photo.id} className="border p-1">
                      <img
                        src={photo.urls.small}
                        alt={photo.description || "Unsplash Image"}
                        className="w-full h-auto"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p>No results found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
