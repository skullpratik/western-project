import { useGLTF } from "@react-three/drei";

// 🔧 Global drawer animation config
const globalDrawerConfig = {
  positionAxis: "z",
  openPosition: 0.7,
  closedPosition: 0.39,
  duration: 0.8,
  ease: "power2.out",
};

export const modelsConfig = {
  Undercounter: {
    assets: {
      base: "/models/BaseModelUndercounter.glb",
      doors: "/models/SolidDoor.glb",
      glassDoors: "/models/GlassDoor.glb",
      drawers: "/models/Drawer.glb",
    },
    hiddenInitially: [
      "Door_01", "Door_02", "Door_03",
      "GlassDoor-01", "GlassDoor-02", "GlassDoor-03",
      "Door_Inside_Panel___01", "Door_Inside_Panel___02", "Door_Inside_Panel___03"
    ],
    camera: { position: [0, 2, 5], target: [0, 1, 0], fov: 50 },
    presets: {
      doorSelections: {
        1: {
          1: { doors: ["Door_01"], panels: ["Door_Inside_Panel___01"], hide: ["Drawer-01001","Drawer-04","Drawer-07","Door_02","Door_03","Drawer-01_Inside_Panal","Door_Inside_Panel___02","Door_Inside_Panel___03"] },
          2: { doors: ["Door_02"], panels: ["Door_Inside_Panel___02"], hide: ["Drawer-05","Drawer-08","Drawer-02","Door_03","Door_01","Drawer-02_Inside_Panal","Door_Inside_Panel___01","Door_Inside_Panel___03"] },
          3: { doors: ["Door_03"], panels: ["Door_Inside_Panel___03"], hide: ["Drawer-03","Drawer-09001","Drawer-03001","Door_01","Door_02","Drawer-03_Inside_Panal","Logo","Door_Inside_Panel___01","Door_Inside_Panel___02"] }
        },
        2: {
          1: { doors: ["Door_01","Door_02"], panels: ["Door_Inside_Panel___01","Door_Inside_Panel___02"], hide: ["Drawer-01001","Drawer-05","Drawer-02","Drawer-08","Drawer-07","Drawer-04","Door_03","Drawer-01_Inside_Panal","Drawer-02_Inside_Panal","Door_Inside_Panel___03"] },
          2: { doors: ["Door_01","Door_03"], panels: ["Door_Inside_Panel___01","Door_Inside_Panel___03"], hide: ["Drawer-01001","Drawer-04","Drawer-03","Drawer-03001","Drawer-09001","Drawer-07","Door_02","Drawer-01_Inside_Panal","Drawer-03_Inside_Panal","Door_Inside_Panel___02"] },
          3: { doors: ["Door_02","Door_03"], panels: ["Door_Inside_Panel___01","Door_Inside_Panel___03"], hide: ["Drawer-08","Drawer-09001","Drawer-05","Drawer-02","Drawer-03","Drawer-03001","Door_01","Drawer-03_Inside_Panal","Drawer-02_Inside_Panal","Door_Inside_Panel___01"] }
        },
        3: {
          1: {
            doors: ["Door_01","Door_02","Door_03"],
            panels: ["Door_Inside_Panel___01","Door_Inside_Panel___02","Door_Inside_Panel___03"],
            hide: ["Drawer-01001","Drawer-04","Drawer-07","Drawer-01_Inside_Panal","Drawer-05","Drawer-08","Drawer-02","Drawer-02_Inside_Panal","Drawer-03","Drawer-09001","Drawer-03001","Drawer-03_Inside_Panal","Logo"]
          }
        }
      },
      doorTypeMap: {
        toGlass: { Door_01:"GlassDoor-01", Door_02:"GlassDoor-02", Door_03:"GlassDoor-03" },
        toSolid: { "GlassDoor-01":"Door_01","GlassDoor-02":"Door_02","GlassDoor-03":"Door_03" }
      },
    },
    interactionGroups: [
      {
        type: "doors", label: "Solid Doors",
        parts: [
          { name:"Door_01", rotationAxis:"y", openAngle:-90 },
          { name:"Door_02", rotationAxis:"z", openAngle:-90 },
          { name:"Door_03", rotationAxis:"z", openAngle:-90 }
        ]
      },
      {
        type: "Glassdoors", label: "Glass Doors",
        parts: [
          { name:"GlassDoor-01", rotationAxis:"z", openAngle:-90 },
          { name:"GlassDoor-02", rotationAxis:"z", openAngle:-90 },
          { name:"GlassDoor-03", rotationAxis:"z", openAngle:-90 }
        ]
      },
      {
        type: "drawers", label: "Drawers",
        parts: [
          { name:"Drawer-09001", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
          { name:"Drawer-03001", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
          { name:"Drawer-05", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
          { name:"Drawer-08", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
          { name:"Drawer-07", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
          { name:"Drawer-04", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
          { name:"Drawer-03", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
          { name:"Drawer-02", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
          { name:"Drawer-01001", ...globalDrawerConfig, initialState:{visible:true,position:{z:0.39}} },
        ]
      },
    ],
    uiWidgets: [
      { type: "doorPresets", title: "Door Presets" },
      { 
        type: "globalTextureWidget", 
        title: "Global Texture", 
        options: { 
          exclude: ["Cylinder001.003","Node_4365","Cylinder001"] 
        } 
      },
    ],
  },

  Visicooler: {
    path: "/models/Visicooler.glb",
    hideDoorsByDefault: false,
    lights: [
      { 
        name: "Point", 
        defaultState: "on",
        intensity: 9.0
      },
    ],
    interactionGroups: [
      { type:"doors", label:"Door", parts:[{ name:"Door", rotationAxis:"y", openAngle:90 }] },
      { type:"toggles", label:"Lights", parts:[{ name:"Light1001", label:"LED Light" }] },
    ],
    uiWidgets: [
      { type: "lightWidget", title: "Light Control" },
      {
        type: "textureWidget",
        title: "Textures",
        options: {
          parts: [
            {
              name: "canopy",
               mapping: {
                offset: { x: 0, y: -0.25 },
                center: { x: 0.5, y:-0.05 },
                flipY: false, 
                repeat: { x: 1, y: 1.9 },
                wrapS: "ClampToEdgeWrapping",
                wrapT: "ClampToEdgeWrapping"
              }
            },
            {
              name: "SidePannel1",
              mapping: {
                flipY: false,
                offset: { x: -0.25, y: 0 },
                center: { x: 0.5, y: 0.5 },
                rotation: Math.PI,
                repeat: { x: 3.2, y: 0.9 },
                wrapS: "ClampToEdgeWrapping",
                wrapT: "ClampToEdgeWrapping"
              }
            },
            {
              name: "SidePannel2",
              mapping: {
                flipY: false,
                offset: { x: -0.25, y: 0 },
                center: { x: 0.5, y: 0.5 },
                rotation: Math.PI,
                repeat: { x: 3.2, y: 0.9 },
                wrapS: "ClampToEdgeWrapping",
                wrapT: "ClampToEdgeWrapping"
              }
            },
            {
              name: "Louver",
              mapping: {
                flipY: false,
                offset: { x: -0.25, y: 0 },
                center: { x: 0.5, y: 0.5 },
                rotation: Math.PI,
                repeat: { x: 3.2, y: 0.9 },
                wrapS: "ClampToEdgeWrapping",
                wrapT: "ClampToEdgeWrapping"
              }
            }
          ],     
          textures: [
            { name:"canopy", path:"/texture/pepsicanopy.jpg" },
            { name:"Glass Clear", path:"/textures/clear_glass.jpg" },
          ]
        }
      }
    ],
    camera: { position:[0,2.5,7], target:[0,1,0], fov:50 },
  },

  DeepFridge: {
    path: "/models/DeepFridge.glb",
    hideDoorsByDefault: false,
    lights: [
      { 
        name: "FridgeLight", 
        defaultState: "off",
        intensity: 1.0
      }
    ],
    interactionGroups: [
      { type:"doors", label:"Doors", parts:[{ name:"Door1", rotationAxis:"x", openAngle:-90 },{ name:"Door2", rotationAxis:"x", openAngle:-90 }] },
      { type:"toggles", label:"Lights", parts:[{ name:"Point", label:"Interior Light" }] },
    ],
    uiWidgets: [
      { type: "lightWidget", title: "Light Control" },
      {
        type: "textureWidget",
        title: "Textures",
        options: {
          parts: [
            {
              name: "FrontPannel",
              mapping: {
                repeat: { x: 1, y: 1 },
                flipY: false,
              }
            },
            {
              name: "SidePannelRight",
              mapping: {
                repeat: { x: 1, y: 1 },
                flipY: false,
              }
            },
            {
              name: "SidePannelLeft",
              mapping: {
                repeat: { x: 1, y: 1 },
                flipY: false,
              }
            }
          ],
          textures: [
            { name:"Glass Frosted", path:"/textures/frosted_glass.jpg" },
            { name:"Glass Clear", path:"/textures/clear_glass.jpg" },
          ]
        }
      }
    ],
    camera: { position:[0,2.5,7], target:[0,1,0], fov:50 },
  },

  NewCoolFridge: {
    path: "/models/New.glb",
    hideDoorsByDefault: false,
    hiddenInitially: [],
    lights: [],
    interactionGroups: [
      {
        type: "doors",
        label: "Doors",
        parts: [
          { name: "Door_1", rotationAxis: "y", openAngle: 90 },
          { name: "Door_2", rotationAxis: "y", openAngle: 90 },
          { name: "Door_3", rotationAxis: "y", openAngle: 90 },
          { name: "Door_4", rotationAxis: "y", openAngle: 90 },
        ],
      },
      {
        type: "drawers",
        label: "Drawers",
        parts: [
          { name: "TopDrawer", positionAxis: "z", openPosition: 0.18 },
        ],
      },
    ],
    uiWidgets: [
      { 
        type: "globalTextureWidget", 
        title: "Global Texture", 
        options: { 
          exclude: ["Cylinder001.003","Node_4365","Cylinder001"] 
        } 
      },
    ],
    camera: { position: [0, 4, 11], target: [0, 1, 0], fov: 50 },
  },
};

// 🔧 Preload all models
Object.values(modelsConfig).forEach((config) => {
  if (config.assets) {
    Object.values(config.assets).forEach((p) => p && useGLTF.preload(p));
  } else if (config.path) {
    useGLTF.preload(config.path);
  }
});
