export function useLogos(allObjects, logoRef, logo2Ref) {
  const updateLogoVisibility = () => {
    const door3Solid = allObjects.current["Door_03"];
    const drawer3 = allObjects.current["Drawer-03"];

    if (!logoRef.current || !logo2Ref.current) return;

    if (door3Solid?.visible) {
      logo2Ref.current.visible = true;
      logoRef.current.visible = false;
    } else if (drawer3?.visible) {
      logo2Ref.current.visible = false;
      logoRef.current.visible = true;
    } else {
      logo2Ref.current.visible = false;
      logoRef.current.visible = false;
    }
  };

  return { updateLogoVisibility };
}
