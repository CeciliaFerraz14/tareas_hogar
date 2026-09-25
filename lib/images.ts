import * as ImagePicker from 'expo-image-picker';
import { File as FsFile } from 'expo-file-system';
import { Platform } from 'react-native';
import { Alert } from './alert';
import { supabase } from './supabase';

export type ImageSource = 'gallery' | 'camera';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, igual que el límite de los buckets

/** Pregunta si la foto sale de la galería o de la cámara. */
export function chooseImageSource(title: string, onChoose: (source: ImageSource) => void) {
  // En web el navegador abre su propio selector (en el móvil ya ofrece la cámara).
  if (Platform.OS === 'web') {
    onChoose('gallery');
    return;
  }
  Alert.alert(title, 'Elige una opción', [
    { text: 'Galería', onPress: () => onChoose('gallery') },
    { text: 'Cámara', onPress: () => onChoose('camera') },
    { text: 'Cancelar', style: 'cancel' },
  ]);
}

/**
 * Abre la galería o la cámara con recorte cuadrado. Devuelve null si se cancela,
 * falta el permiso o la imagen supera 5 MB (avisando al usuario).
 */
export async function pickSquareImage(source: ImageSource): Promise<ImagePicker.ImagePickerAsset | null> {
  const permResult = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permResult.status !== 'granted') {
    Alert.alert('Permiso denegado', 'Activa el permiso en los ajustes del sistema.');
    return null;
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.7 };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);

  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    Alert.alert('Imagen demasiado grande', 'El límite es 5 MB. Elige una foto más pequeña.');
    return null;
  }
  return asset;
}

/**
 * Sube (o reemplaza) una imagen en un bucket público y devuelve su URL pública,
 * con un parámetro de versión para que las cachés muestren la foto nueva.
 */
export async function uploadPublicImage(
  bucket: string,
  path: string,
  asset: ImagePicker.ImagePickerAsset,
): Promise<{ url: string | null; error: string | null }> {
  // Los bytes se leen con expo-file-system: fetch(uri).arrayBuffer() no lee
  // ficheros locales en Android (subía ~14 bytes vacíos) y un Blob se sube como
  // text/plain. Con ArrayBuffer Storage recibe la imagen y su tipo real.
  // En web la imagen es una URL blob: del navegador, que fetch sí sabe leer.
  const arrayBuffer =
    Platform.OS === 'web'
      ? await fetch(asset.uri).then((res) => res.arrayBuffer())
      : await new FsFile(asset.uri).arrayBuffer();
  if (arrayBuffer.byteLength === 0) return { url: null, error: 'No se pudo leer la imagen.' };

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { upsert: true, contentType: asset.mimeType ?? 'image/jpeg' });
  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: `${data.publicUrl}?t=${Date.now()}`, error: null };
}
