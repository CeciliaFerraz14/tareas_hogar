import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Alert } from '../../../../lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react-native';
import { Screen } from '../../../../components/ui/Screen';
import { Text } from '../../../../components/ui/Text';
import { Subtitle } from '../../../../components/ui/Labels';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { PlusButton } from '../../../../components/ui/PlusButton';
import { RecipeFormModal } from '../../../../components/menu/RecipeFormModal';
import { subscribeToHouseTables } from '../../../../lib/realtime';
import { useTheme } from '../../../../lib/theme';
import { ingredientsSummary, loadRecipes, normalizeTitle, type Recipe } from '../../../../lib/meals';
import { useSyncActiveHouse } from '../../../../store/houseStore';

/** Con más recetas que esto aparece el buscador. */
const SEARCH_FROM = 6;

export default function RecetasScreen() {
  const { id: houseId } = useLocalSearchParams<{ id: string }>();
  useSyncActiveHouse(houseId);
  const router = useRouter();
  const theme = useTheme();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // La receta abierta se guarda aparte de `formOpen` para que la hoja se cierre con su animación.
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!houseId) return;
    try {
      setRecipes(await loadRecipes(houseId));
    } catch (e) {
      Alert.alert('Error al cargar el recetario', e instanceof Error ? e.message : String(e));
    }
  }, [houseId]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function handleRefresh() { setRefreshing(true); await loadData(); setRefreshing(false); }

  // Realtime por Broadcast: las recetas que crean o cambian los demás aparecen solas.
  useEffect(() => {
    if (!houseId) return;
    return subscribeToHouseTables(houseId, ['recipes'], () => { void loadData(); });
  }, [houseId, loadData]);

  function openRecipe(recipe: Recipe | null) {
    setEditing(recipe);
    setFormOpen(true);
  }

  const q = normalizeTitle(query);
  const visible = q
    ? recipes.filter((r) => normalizeTitle(r.title).includes(q) || r.ingredients.some((i) => normalizeTitle(i.name).includes(q)))
    : recipes;

  const gutter = theme.spacing.md;

  return (
    <Screen contentStyle={{ padding: 0, gap: 0 }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: theme.spacing.md, paddingHorizontal: gutter }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="heading">Recetario</Text>
          <Subtitle>
            {recipes.length === 0 ? 'Vuestros platos de siempre' : `${recipes.length} ${recipes.length === 1 ? 'receta' : 'recetas'}`}
          </Subtitle>
        </View>
        <PlusButton onPress={() => openRecipe(null)} accessibilityLabel="Nueva receta" />
      </View>

      {recipes.length > SEARCH_FROM ? (
        <View style={{ paddingHorizontal: gutter, paddingBottom: theme.spacing.md }}>
          <Input
            placeholder="Buscar receta o ingrediente…"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            style={{ paddingVertical: 10 }}
          />
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 10, paddingHorizontal: gutter, paddingTop: 4, paddingBottom: theme.spacing.lg, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
      >
        {recipes.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: theme.colors.peach,
                borderWidth: theme.borderWidth,
                borderColor: theme.colors.outline,
                alignItems: 'center',
                justifyContent: 'center',
                ...theme.shadows.small,
              }}
            >
              <BookOpen size={32} color={theme.colors.textOnFill} />
            </View>
            <Text variant="heading">Aún no hay recetas</Text>
            <Text variant="body" align="center">
              Apunta vuestros platos con sus ingredientes. Luego, desde el menú, podréis pasarlos a la compra con un toque.
            </Text>
          </View>
        ) : visible.length === 0 ? (
          <Text variant="bodyBold" align="center" style={{ paddingVertical: 32 }}>
            Ninguna receta coincide con «{query.trim()}».
          </Text>
        ) : (
          visible.map((recipe) => (
            <Pressable key={recipe.id} onPress={() => openRecipe(recipe)} accessibilityRole="button" accessibilityHint="Editar receta">
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyBold">{recipe.title}</Text>
                    <Text variant="caption" color="secondary" numberOfLines={1}>
                      {recipe.ingredients.length > 0
                        ? `${recipe.ingredients.length} · ${ingredientsSummary(recipe.ingredients)}`
                        : 'Sin ingredientes'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={theme.colors.textSecondary} />
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>

      {houseId ? (
        <RecipeFormModal
          visible={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={() => void loadData()}
          houseId={houseId}
          recipe={editing}
        />
      ) : null}
    </Screen>
  );
}
