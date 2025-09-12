// 🚀 Simplified Model Configuration using Builder System
import { ModelConfigBuilder, ModelTemplates } from './utils/modelConfigBuilder';

// 🔧 Global drawer animation config
const globalDrawerConfig = {
  positionAxis: "z",
  openPosition: 0.7,
  closedPosition: 0.39,
  duration: 0.8,
  ease: "power2.out",
};

// 🏗️ Build configurations using the new system
export const modelsConfig = {
  // ✅ Simple Models - Much easier now!
  Visicooler: ModelTemplates.refrigerator("Visicooler", "/models/Visicooler.glb")
    .addLight("Point", "on", 9.0)
    .addDoorGroup("Main Door", [
      { name: "Door", axis: "y", angle: 90 }
    ])
    .addTextureWidget("Textures", 
      [
        { name: "canopy", mapping: { offset: { x: 0, y: -0.25 }, center: { x: 0.5, y: -0.05 }, flipY: false, repeat: { x: 1, y: 1.9 } } },
        { name: "SidePannel1", mapping: { flipY: false, offset: { x: -0.25, y: 0 }, center: { x: 0.5, y: 0.5 }, rotation: Math.PI, repeat: { x: 3.2, y: 0.9 } } },
        { name: "SidePannel2", mapping: { flipY: false, offset: { x: -0.25, y: 0 }, center: { x: 0.5, y: 0.5 }, rotation: Math.PI, repeat: { x: 3.2, y: 0.9 } } },
        { name: "Louver", mapping: { flipY: false, offset: { x: -0.25, y: 0 }, center: { x: 0.5, y: 0.5 }, rotation: Math.PI, repeat: { x: 3.2, y: 0.9 } } }
      ],
      [
        { name: "canopy", path: "/texture/pepsicanopy.jpg" },
        { name: "Glass Clear", path: "/textures/clear_glass.jpg" }
      ]
    )
    .build(),

  DeepFridge: ModelTemplates.refrigerator("DeepFridge", "/models/DeepFridge.glb")
    .addLight("FridgeLight", "off", 1.0)
    .addDoorGroup("Main Doors", [
      { name: "Door1", axis: "x", angle: -90 },
      { name: "Door2", axis: "x", angle: -90 }
    ])
    .addTextureWidget("Textures",
      [
        { name: "FrontPannel", mapping: { repeat: { x: 1, y: 1 }, flipY: false } },
        { name: "SidePannelRight", mapping: { repeat: { x: 1, y: 1 }, flipY: false } },
        { name: "SidePannelLeft", mapping: { repeat: { x: 1, y: 1 }, flipY: false } }
      ],
      [
        { name: "Glass Frosted", path: "/textures/frosted_glass.jpg" },
        { name: "Glass Clear", path: "/textures/clear_glass.jpg" }
      ]
    )
    .build(),

  NewCoolFridge: ModelTemplates.simple("NewCoolFridge", "/models/New.glb")
    .addDoorGroup("Doors", [
      { name: "Door_1", axis: "y", angle: 90 },
      { name: "Door_2", axis: "y", angle: 90 },
      { name: "Door_3", axis: "y", angle: 90 },
      { name: "Door_4", axis: "y", angle: 90 }
    ])
    .build(),

  // 🔥 Complex Model - Still complex but MUCH more organized!
  Undercounter: (() => {
    const builder = new ModelConfigBuilder("Undercounter")
      .addAssets({
        base: "/models/BaseModelUndercounter.glb",
        doors: "/models/SolidDoor.glb",
        glassDoors: "/models/GlassDoor.glb",
        drawers: "/models/Drawer.glb",
      })
      .setCamera([0, 2, 5], [0, 1, 0], 50)
      .hideInitially([
        "Door_01", "Door_02", "Door_03",
        "GlassDoor-01", "GlassDoor-02", "GlassDoor-03",
        "Door_Inside_Panel___01", "Door_Inside_Panel___02", "Door_Inside_Panel___03"
      ])
      
      // 🚪 Door Groups
      .addDoorGroup("Solid Doors", [
        { name: "Door_01", axis: "y", angle: -90 },
        { name: "Door_02", axis: "z", angle: -90 },
        { name: "Door_03", axis: "z", angle: -90 }
      ])
      .addDoorGroup("Glass Doors", [
        { name: "GlassDoor-01", axis: "z", angle: -90 },
        { name: "GlassDoor-02", axis: "z", angle: -90 },
        { name: "GlassDoor-03", axis: "z", angle: -90 }
      ])
      
      // 🗂️ Drawer Group
      .addDrawerGroup("Main Drawers", [
        { name: "Drawer-09001" },
        { name: "Drawer-03001" },
        { name: "Drawer-05" },
        { name: "Drawer-08" },
        { name: "Drawer-07" },
        { name: "Drawer-04" },
        { name: "Drawer-03" },
        { name: "Drawer-02" },
        { name: "Drawer-01001" }
      ], globalDrawerConfig)
      
      // 🎛️ UI Widgets
      .addGlobalTextureWidget("Global Texture", ["Cylinder001.003", "Node_4365", "Cylinder001"]);

    // 🎭 Complex Door Presets (still needed for this specific model)
    const config = builder.build();
    
    // Add the complex presets manually for now
    config.presets = {
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
      }
    };

    // Add door presets widget
    config.uiWidgets.unshift({ type: "doorPresets", title: "Door Presets" });

    return config;
  })()
};

// 🚀 Easy way to add new models in the future
export const addNewModel = (name, config) => {
  modelsConfig[name] = config;
};

// 📚 Documentation for adding new models
export const QUICK_START_GUIDE = `
🚀 QUICK START: Adding New Models

1. SIMPLE MODEL (single file):
   const myModel = ModelTemplates.simple("MyModel", "/models/my-model.glb")
     .addLight("InteriorLight", "off", 1.0)
     .addDoorGroup("Main Doors", [
       { name: "Door1", axis: "y", angle: 90 }
     ])
     .build();

2. REFRIGERATOR MODEL (doors + lights):
   const myFridge = ModelTemplates.refrigerator("MyFridge", "/models/fridge.glb")
     .addDoorGroup("Main Doors", [
       { name: "LeftDoor", axis: "y", angle: 90 },
       { name: "RightDoor", axis: "y", angle: -90 }
     ])
     .build();

3. COMPLEX MODEL (multiple assets):
   const complex = new ModelConfigBuilder("ComplexModel")
     .addAssets({
       base: "/models/base.glb",
       doors: "/models/doors.glb",
       drawers: "/models/drawers.glb"
     })
     .addDoorGroup("Main Doors", [...])
     .addDrawerGroup("Drawers", [...])
     .addTextureWidget("Textures", [...], [...])
     .build();

4. ADD TO CONFIG:
   modelsConfig.MyNewModel = myModel;

🔧 Use the ModelConfigGenerator component for a visual interface!
`;
