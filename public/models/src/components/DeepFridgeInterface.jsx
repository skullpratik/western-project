import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { styled } from '@mui/material/styles';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import ViewInArIcon from "@mui/icons-material/ViewInAr";

const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
  borderRadius: theme.shape.borderRadius * 2,
}));

const UploadButton = styled(Button)(({ theme }) => ({
  py: 1.5,
  backgroundColor: "#f7f9fc",
  border: "1px dashed #ccc",
  "&:hover": {
    border: "1px dashed #007bff",
    backgroundColor: "#e3f2fd",
  },
  borderRadius: theme.shape.borderRadius,
  textTransform: 'none',
  fontSize: '0.875rem'
}));

const ViewARButton = styled(Button)(({ theme }) => ({
  backgroundColor: '#5A67D8',
  color: '#fff',
  fontWeight: 600,
  textTransform: 'none',
  fontSize: '0.875rem',
  padding: '10px 18px',
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: '0 4px 12px rgba(90, 103, 216, 0.4)',
  whiteSpace: 'nowrap', // Prevents the button text from wrapping
  flexShrink: 0, // Prevents the button from shrinking
  transition: 'background-color 0.3s ease-in-out, transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: '#434D9A',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(90, 103, 216, 0.5)',
  },
}));

export function Interface({
  onFrontTextureUpload,
  onFrontTextureReset,
  onLeftTextureUpload,
  onLeftTextureReset,
  onRightTextureUpload,
  onRightTextureReset,
}) {
  const [uploadingFront, setUploadingFront] = useState(false);
  const [frontImage, setFrontImage] = useState(null);
  const frontInputRef = useRef(null);
  const [uploadingLeft, setUploadingLeft] = useState(false);
  const [leftImage, setLeftImage] = useState(null);
  const leftInputRef = useRef(null);
  const [uploadingRight, setUploadingRight] = useState(false);
  const [rightImage, setRightImage] = useState(null);
  const rightInputRef = useRef(null);

  const handleARRedirect = () => {
    window.location.href = `AR.html?model=deepfreezer`;
  };

  const readImage = (file, onDone, setUploading) => {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      onDone(e.target.result);
      setUploading(false);
    };
    reader.onerror = () => {
      console.error("Error reading file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const renderUploadSection = (
    title,
    image,
    setImage,
    inputRef,
    uploading,
    setUploading,
    onUpload,
    onReset
  ) => (
    <StyledCard variant="outlined">
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            mb: 1.5,
            display: "flex",
            alignItems: "center",
          }}
        >
          <ImageIcon sx={{ mr: 1, fontSize: 18 }} /> {title}
        </Typography>
        {image ? (
          <Box sx={{ position: "relative", mb: 1.5 }}>
            <Box
              component="img"
              src={image}
              sx={{
                width: "100%",
                height: 120,
                objectFit: "cover",
                borderRadius: 1,
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
              alt={title}
            />
            <IconButton
              size="small"
              onClick={() => {
                setImage(null);
                if (inputRef.current) inputRef.current.value = "";
                onReset?.();
              }}
              sx={{
                position: "absolute",
                top: 6,
                right: 6,
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "white",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.9)" },
                width: 28,
                height: 28,
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <UploadButton
            variant="outlined"
            component="label"
            fullWidth
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </UploadButton>
        )}
        <input
          type="file"
          ref={inputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            readImage(file, (url) => {
              setImage(url);
              onUpload?.(url);
            }, setUploading);
            e.target.value = "";
          }}
          accept="image/*"
          hidden
        />
        <Typography
          variant="caption"
          sx={{ mt: 1, display: "block", color: "text.secondary" }}
        >
          JPG, PNG. Max 5MB.
        </Typography>
      </CardContent>
    </StyledCard>
  );

  return (
    <Box sx={{
      p: 3,
      backgroundColor: '#f5f5f5',
      minHeight: '100vh',
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
          Deep Freezer Customization
        </Typography>
        <ViewARButton
          variant="contained"
          size="small"
          startIcon={<ViewInArIcon />}
          onClick={handleARRedirect}
        >
          View in AR
        </ViewARButton>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          {renderUploadSection(
            "Front Panel",
            frontImage,
            setFrontImage,
            frontInputRef,
            uploadingFront,
            setUploadingFront,
            onFrontTextureUpload,
            onFrontTextureReset
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {renderUploadSection(
            "Right Panel",
            leftImage,
            setLeftImage,
            leftInputRef,
            uploadingLeft,
            setUploadingLeft,
            onLeftTextureUpload,
            onLeftTextureReset
          )}
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          {renderUploadSection(
            "Left Panel",
            rightImage,
            setRightImage,
            rightInputRef,
            uploadingRight,
            setUploadingRight,
            onRightTextureUpload,
            onRightTextureReset
          )}
        </Grid>
      </Grid>
    </Box>
  );
}