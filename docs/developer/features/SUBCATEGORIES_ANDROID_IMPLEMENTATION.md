# Subcategory System - Android Implementation Guide

## Context

The backend (OraWebApp) has been updated to support subcategories for organizing lessons. This document guides the Android implementation to display lessons in horizontal carousels grouped by subcategory.

**Backend Branch**: `feat/subcategories-system` on OraWebApp
**Backend PR**: https://github.com/Chrisdesmurger/OraWebApp/pull/new/feat/subcategories-system

## API Endpoint

### GET /api/categories/{category}/lessons

Returns lessons grouped by subcategory for a given category.

**URL**: `https://your-api.com/api/categories/{category}/lessons`

**Categories**: `yoga`, `pilates`, `meditation`, `breathing` (or `respiration`), `self_massage` (or `auto-massage`)

**Query Parameters**:
- `status`: `ready` (default) | `draft` | `all`

**Response Structure**:
```json
{
  "category": "yoga",
  "groups": [
    {
      "subcategory": {
        "id": "abc123",
        "category": "yoga",
        "name": {
          "fr": "Soulager les maux",
          "en": "Relieve Pain",
          "es": "Aliviar dolores"
        },
        "description": {
          "fr": "...",
          "en": "...",
          "es": "..."
        },
        "slug": "soulager-les-maux",
        "displayOrder": 0,
        "iconUrl": null,
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "createdBy": "admin-uid"
      },
      "lessons": [
        {
          "id": "lesson1",
          "title": { "fr": "...", "en": "...", "es": "..." },
          "description": { "fr": "...", "en": "...", "es": "..." },
          "category": "yoga",
          "subcategoryId": "abc123",
          "subcategorySlug": "soulager-les-maux",
          "type": "video",
          "durationSec": 600,
          "status": "ready",
          "thumbnailUrl": "...",
          "previewImageUrl": "..."
          // ... other lesson fields
        }
      ]
    },
    {
      "subcategory": null,
      "lessons": [/* Lessons without subcategory - display as "Autres" */]
    }
  ],
  "totalLessons": 15
}
```

**Important**: When `subcategory` is `null`, these are uncategorized lessons that should be displayed in an "Autres" (Others) section at the bottom.

---

## Implementation Plan

### Phase 1: Data Models

#### 1.1 Create `data/model/Subcategory.kt`

```kotlin
package com.music.relaxingmusic.data.model

/**
 * Subcategory model for organizing lessons within a category.
 * Displayed as section headers in the horizontal carousel layout.
 */
data class Subcategory(
    val id: String,
    val category: String,
    val nameFr: String,
    val nameEn: String?,
    val nameEs: String?,
    val descriptionFr: String?,
    val descriptionEn: String?,
    val descriptionEs: String?,
    val slug: String,
    val displayOrder: Int,
    val iconUrl: String?,
    val status: String // "active" | "inactive"
) {
    /**
     * Get localized name based on device locale
     */
    fun getLocalizedName(locale: String = "fr"): String {
        return when (locale) {
            "en" -> nameEn ?: nameFr
            "es" -> nameEs ?: nameFr
            else -> nameFr
        }
    }

    /**
     * Get localized description based on device locale
     */
    fun getLocalizedDescription(locale: String = "fr"): String? {
        return when (locale) {
            "en" -> descriptionEn ?: descriptionFr
            "es" -> descriptionEs ?: descriptionFr
            else -> descriptionFr
        }
    }
}
```

#### 1.2 Create `data/model/SubcategoryWithLessons.kt`

```kotlin
package com.music.relaxingmusic.data.model

/**
 * A subcategory with its associated lessons.
 * Used to display a horizontal carousel of lessons under a subcategory header.
 *
 * @property subcategory The subcategory info, or null for uncategorized lessons ("Autres")
 * @property lessons List of lessons belonging to this subcategory
 */
data class SubcategoryWithLessons(
    val subcategory: Subcategory?,
    val lessons: List<ContentItem>
) {
    /**
     * Get the display name for this section.
     * Returns "Autres" (Others) if subcategory is null.
     */
    fun getSectionName(locale: String = "fr"): String {
        return subcategory?.getLocalizedName(locale) ?: when (locale) {
            "en" -> "Others"
            "es" -> "Otros"
            else -> "Autres"
        }
    }
}
```

#### 1.3 Create `data/model/firestore/SubcategoryDocument.kt`

```kotlin
package com.music.relaxingmusic.data.model.firestore

import com.google.firebase.firestore.PropertyName
import com.music.relaxingmusic.data.model.Subcategory

/**
 * Firestore document model for subcategories (snake_case)
 */
data class SubcategoryDocument(
    @get:PropertyName("category") @set:PropertyName("category")
    var category: String = "",

    @get:PropertyName("name_fr") @set:PropertyName("name_fr")
    var nameFr: String = "",

    @get:PropertyName("name_en") @set:PropertyName("name_en")
    var nameEn: String? = null,

    @get:PropertyName("name_es") @set:PropertyName("name_es")
    var nameEs: String? = null,

    @get:PropertyName("description_fr") @set:PropertyName("description_fr")
    var descriptionFr: String? = null,

    @get:PropertyName("description_en") @set:PropertyName("description_en")
    var descriptionEn: String? = null,

    @get:PropertyName("description_es") @set:PropertyName("description_es")
    var descriptionEs: String? = null,

    @get:PropertyName("slug") @set:PropertyName("slug")
    var slug: String = "",

    @get:PropertyName("display_order") @set:PropertyName("display_order")
    var displayOrder: Int = 0,

    @get:PropertyName("icon_url") @set:PropertyName("icon_url")
    var iconUrl: String? = null,

    @get:PropertyName("status") @set:PropertyName("status")
    var status: String = "active"
) {
    fun toSubcategory(id: String): Subcategory {
        return Subcategory(
            id = id,
            category = category,
            nameFr = nameFr,
            nameEn = nameEn,
            nameEs = nameEs,
            descriptionFr = descriptionFr,
            descriptionEn = descriptionEn,
            descriptionEs = descriptionEs,
            slug = slug,
            displayOrder = displayOrder,
            iconUrl = iconUrl,
            status = status
        )
    }
}
```

#### 1.4 Update `data/model/firestore/LessonDocument.kt`

Add these fields to the existing LessonDocument:

```kotlin
@get:PropertyName("subcategory_id") @set:PropertyName("subcategory_id")
var subcategoryId: String? = null,

@get:PropertyName("subcategory_slug") @set:PropertyName("subcategory_slug")
var subcategorySlug: String? = null,
```

#### 1.5 Update `data/model/ContentItem.kt`

Add subcategory fields to ContentItem:

```kotlin
val subcategoryId: String? = null,
val subcategorySlug: String? = null,
```

---

### Phase 2: Repository Layer

#### 2.1 Update `domain/repository/ContentRepository.kt`

Add this method to fetch lessons grouped by subcategory:

```kotlin
/**
 * Fetch lessons for a category, grouped by subcategory.
 *
 * @param category The category (yoga, pilates, meditation, respiration, auto-massage)
 * @return Flow of SubcategoryWithLessons list, ordered by displayOrder
 */
suspend fun getLessonsGroupedBySubcategory(category: String): Flow<List<SubcategoryWithLessons>>
```

**Implementation approach** (choose one):

**Option A: Direct Firestore queries** (recommended for offline support)
```kotlin
override suspend fun getLessonsGroupedBySubcategory(category: String): Flow<List<SubcategoryWithLessons>> {
    return flow {
        // 1. Fetch active subcategories for this category
        val subcategoriesSnapshot = firestore.collection("subcategories")
            .whereEqualTo("category", category)
            .whereEqualTo("status", "active")
            .orderBy("display_order", Query.Direction.ASCENDING)
            .get()
            .await()

        val subcategories = subcategoriesSnapshot.documents.map { doc ->
            doc.toObject(SubcategoryDocument::class.java)?.toSubcategory(doc.id)
        }.filterNotNull()

        // 2. Fetch all lessons for this category
        val lessonsSnapshot = firestore.collection("lessons")
            .whereEqualTo("category", category)
            .whereEqualTo("status", "ready")
            .get()
            .await()

        val lessons = lessonsSnapshot.documents.mapNotNull { doc ->
            doc.toObject(LessonDocument::class.java)?.toContentItem(doc.id)
        }

        // 3. Group lessons by subcategory
        val lessonsBySubcategory = lessons.groupBy { it.subcategoryId }

        // 4. Build result list
        val result = mutableListOf<SubcategoryWithLessons>()

        // Add subcategory groups (in display_order)
        subcategories.forEach { subcategory ->
            val subcategoryLessons = lessonsBySubcategory[subcategory.id] ?: emptyList()
            if (subcategoryLessons.isNotEmpty()) {
                result.add(SubcategoryWithLessons(
                    subcategory = subcategory,
                    lessons = subcategoryLessons.sortedBy { it.order }
                ))
            }
        }

        // Add "Autres" group for uncategorized lessons
        val uncategorizedLessons = lessonsBySubcategory[null] ?: emptyList()
        if (uncategorizedLessons.isNotEmpty()) {
            result.add(SubcategoryWithLessons(
                subcategory = null,
                lessons = uncategorizedLessons.sortedBy { it.order }
            ))
        }

        emit(result)
    }
}
```

**Option B: API call to backend**
```kotlin
override suspend fun getLessonsGroupedBySubcategory(category: String): Flow<List<SubcategoryWithLessons>> {
    return flow {
        val response = apiService.getGroupedLessons(category)
        emit(response.groups.map { group ->
            SubcategoryWithLessons(
                subcategory = group.subcategory,
                lessons = group.lessons.map { it.toContentItem() }
            )
        })
    }
}
```

---

### Phase 3: ViewModel

#### 3.1 Refactor `ContentCategoryDetailViewModel.kt`

```kotlin
@HiltViewModel
class ContentCategoryDetailViewModel @Inject constructor(
    private val contentRepository: ContentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val category: String = checkNotNull(savedStateHandle["category"])

    // UI State
    private val _uiState = MutableStateFlow(ContentCategoryDetailUiState())
    val uiState: StateFlow<ContentCategoryDetailUiState> = _uiState.asStateFlow()

    init {
        loadGroupedLessons()
    }

    private fun loadGroupedLessons() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            try {
                contentRepository.getLessonsGroupedBySubcategory(category)
                    .collect { groups ->
                        _uiState.update { state ->
                            state.copy(
                                isLoading = false,
                                subcategoryGroups = groups,
                                totalLessons = groups.sumOf { it.lessons.size }
                            )
                        }
                    }
            } catch (e: Exception) {
                _uiState.update { it.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load lessons"
                )}
            }
        }
    }

    fun refresh() {
        loadGroupedLessons()
    }

    fun onLessonClick(lesson: ContentItem) {
        // Navigate to lesson detail/player
    }
}

data class ContentCategoryDetailUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val subcategoryGroups: List<SubcategoryWithLessons> = emptyList(),
    val totalLessons: Int = 0
)
```

---

### Phase 4: UI - Compose Screen

#### 4.1 Refactor `ContentCategoryDetailScreen.kt`

Transform from `LazyVerticalGrid` to `LazyColumn` with horizontal `LazyRow` sections:

```kotlin
@Composable
fun ContentCategoryDetailScreen(
    viewModel: ContentCategoryDetailViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit,
    onLessonClick: (ContentItem) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val locale = Locale.getDefault().language

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(getCategoryDisplayName(viewModel.category)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        when {
            uiState.isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.error != null -> {
                ErrorState(
                    message = uiState.error!!,
                    onRetry = { viewModel.refresh() }
                )
            }
            uiState.subcategoryGroups.isEmpty() -> {
                EmptyState(message = "No lessons available")
            }
            else -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(paddingValues),
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    items(
                        items = uiState.subcategoryGroups,
                        key = { it.subcategory?.id ?: "others" }
                    ) { group ->
                        SubcategorySection(
                            group = group,
                            locale = locale,
                            onLessonClick = onLessonClick
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SubcategorySection(
    group: SubcategoryWithLessons,
    locale: String,
    onLessonClick: (ContentItem) -> Unit
) {
    Column {
        // Section Header
        Text(
            text = group.getSectionName(locale),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        )

        // Optional: Description
        group.subcategory?.getLocalizedDescription(locale)?.let { description ->
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )
        }

        // Horizontal Carousel of Lessons
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(
                items = group.lessons,
                key = { it.id }
            ) { lesson ->
                ContentCard(
                    lesson = lesson,
                    onClick = { onLessonClick(lesson) },
                    modifier = Modifier.width(160.dp) // 3:4 aspect ratio card
                )
            }
        }
    }
}

@Composable
private fun ContentCard(
    lesson: ContentItem,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .aspectRatio(3f / 4f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp)
    ) {
        Box {
            // Thumbnail Image
            AsyncImage(
                model = lesson.previewImageUrl ?: lesson.thumbnailUrl,
                contentDescription = lesson.getLocalizedTitle(),
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Gradient overlay for text readability
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.7f)
                            ),
                            startY = 100f
                        )
                    )
            )

            // Title and Duration
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(12.dp)
            ) {
                Text(
                    text = lesson.getLocalizedTitle(),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                lesson.durationSec?.let { duration ->
                    Text(
                        text = formatDuration(duration),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.8f)
                    )
                }
            }
        }
    }
}

private fun formatDuration(seconds: Int): String {
    val minutes = seconds / 60
    return "$minutes min"
}
```

---

## Visual Layout Reference

```
┌─────────────────────────────────────────────────┐
│ ← Yoga                                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Soulager les maux                               │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                │
│ │     │ │     │ │     │ │     │ → scroll       │
│ │     │ │     │ │     │ │     │                │
│ │     │ │     │ │     │ │     │                │
│ │Title│ │Title│ │Title│ │Title│                │
│ │5min │ │10min│ │15min│ │8min │                │
│ └─────┘ └─────┘ └─────┘ └─────┘                │
│                                                 │
│ Routines du quotidien                           │
│ ┌─────┐ ┌─────┐ ┌─────┐                        │
│ │     │ │     │ │     │ → scroll               │
│ │     │ │     │ │     │                        │
│ │     │ │     │ │     │                        │
│ │Title│ │Title│ │Title│                        │
│ │12min│ │20min│ │7min │                        │
│ └─────┘ └─────┘ └─────┘                        │
│                                                 │
│ ↓ scroll for more sections                      │
│                                                 │
│ Autres (if uncategorized lessons exist)         │
│ ┌─────┐ ┌─────┐                                │
│ │     │ │     │ → scroll                       │
│ └─────┘ └─────┘                                │
└─────────────────────────────────────────────────┘
```

---

## Subcategories Reference

| Category | Subcategories (FR) | Subcategories (EN) |
|----------|-------------------|-------------------|
| **yoga** | Soulager les maux, Routines du quotidien | Relieve Pain, Daily Routines |
| **pilates** | Full body, Bras, Jambes, Fesses | Full Body, Arms, Legs, Glutes |
| **auto-massage** | Visage, Corps | Face, Body |
| **meditation** | Routine du matin, Épanouissement et confiance en soi, Stress/anxiété, Routine du soir, En mouvement | Morning Routine, Growth & Self-Confidence, Stress/Anxiety, Evening Routine, In Motion |
| **respiration** | Respiration Énergies et Émotions, Respiration calmantes et équilibrantes | Energy & Emotion Breathing, Calming & Balancing Breathing |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `data/model/Subcategory.kt` | Create | Subcategory data class |
| `data/model/SubcategoryWithLessons.kt` | Create | Group of subcategory + lessons |
| `data/model/firestore/SubcategoryDocument.kt` | Create | Firestore document mapping |
| `data/model/firestore/LessonDocument.kt` | Modify | Add `subcategory_id`, `subcategory_slug` |
| `data/model/ContentItem.kt` | Modify | Add `subcategoryId`, `subcategorySlug` |
| `domain/repository/ContentRepository.kt` | Modify | Add `getLessonsGroupedBySubcategory()` |
| `presentation/screens/library/ContentCategoryDetailViewModel.kt` | Refactor | Load grouped lessons |
| `presentation/screens/library/ContentCategoryDetailScreen.kt` | Refactor | LazyColumn + LazyRow layout |

---

## Testing Checklist

- [ ] Subcategories display in correct order (by `displayOrder`)
- [ ] Lessons appear in correct subcategory
- [ ] Horizontal scroll works smoothly
- [ ] Uncategorized lessons appear in "Autres" section at bottom
- [ ] Empty subcategories are hidden (no empty sections)
- [ ] Localization works (FR/EN/ES based on device locale)
- [ ] Offline support works (if using Firestore queries)
- [ ] Pull-to-refresh reloads data
- [ ] Navigation to lesson detail works

---

## Notes

1. **Card dimensions**: Use 160dp width with 3:4 aspect ratio to match the home screen "Pensée pour toi" section
2. **Reuse existing components**: The `ContentCard` composable should be similar to existing card components
3. **Empty sections**: Don't show a subcategory section if it has no lessons
4. **Offline first**: Consider using Firestore persistence for offline support
5. **i18n**: Use device locale to determine which language to display (fallback: FR)
