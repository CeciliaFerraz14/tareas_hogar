import { Alert as NativeAlert, Platform, type AlertButton } from 'react-native';

/**
 * En web, `Alert.alert` de react-native-web no hace nada: los avisos y las
 * confirmaciones ("¿Eliminar tarea?") no aparecerían. Aquí se usan los diálogos
 * del navegador:
 *   · sin botones, o solo "Aceptar" → window.alert
 *   · una acción + "Cancelar"       → window.confirm (Aceptar = la acción)
 */
function webAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find((b) => b.style === 'cancel');
  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');

  if (!cancel) {
    window.alert(text);
    actions[0]?.onPress?.();
    return;
  }
  if (actions.length === 0) {
    window.alert(text);
    cancel.onPress?.();
    return;
  }
  // Con varias acciones, el navegador solo permite ofrecer una: la primera.
  const action = actions[0];
  const confirmed = window.confirm(action.text ? `${text}\n\n¿${action.text}?` : text);
  if (confirmed) action.onPress?.();
  else cancel.onPress?.();
}

/** Igual que `Alert` de react-native, pero también funciona en web. */
export const Alert: Pick<typeof NativeAlert, 'alert'> = {
  alert: Platform.OS === 'web' ? webAlert : (...args) => NativeAlert.alert(...args),
};
