import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { resolveRelative } from "../util/path"

type ZettelStatus = "raw" | "seedling" | "budding" | "evergreen" | ""

interface KanbanColumn {
  id: ZettelStatus | string
  label: string
  emoji: string
  description: string
}

const COLUMNS: KanbanColumn[] = [
  { id: "",     label: "Non definito", emoji: "📝", description: "Cattura grezza, non ancora classificata" },
  { id: "raw",  label: "Raw",          emoji: "🌱", description: "Idea catturata, da sviluppare" },
  { id: "0) raw", label: "Raw",        emoji: "🌱", description: "Idea catturata, da sviluppare" },
  { id: "seedling", label: "Seedling", emoji: "🌿", description: "In sviluppo, connessioni in corso" },
  { id: "1) seedling", label: "Seedling", emoji: "🌿", description: "In sviluppo" },
  { id: "budding",  label: "Budding",  emoji: "🌸", description: "Quasi matura, da rifinire" },
  { id: "2) budding", label: "Budding", emoji: "🌸", description: "Quasi matura, da rifinire" },
  { id: "evergreen", label: "Evergreen", emoji: "🌳", description: "Matura e stabile" },
]

// Merge duplicate columns (same label)
const UNIQUE_COLUMNS = [
  { ids: [""], label: "Non definito", emoji: "📝", description: "Cattura grezza, non ancora classificata" },
  { ids: ["raw", "0) raw"], label: "Raw", emoji: "🌱", description: "Idea catturata, da sviluppare" },
  { ids: ["seedling", "1) seedling"], label: "Seedling", emoji: "🌿", description: "In sviluppo, connessioni in corso" },
  { ids: ["budding", "2) budding"], label: "Budding", emoji: "🌸", description: "Quasi matura, da rifinire" },
  { ids: ["evergreen"], label: "Evergreen", emoji: "🌳", description: "Matura e stabile" },
]

const Kanban: QuartzComponent = ({ allFiles, fileData }: QuartzComponentProps) => {
  // Only render on the kanban page
  if (fileData.slug !== "kanban") return null

  const notesByStatus: Record<string, typeof allFiles> = {}
  UNIQUE_COLUMNS.forEach(col => { notesByStatus[col.label] = [] })

  allFiles.forEach(file => {
    const status = (file.frontmatter?.["zettel-status"] as string) ?? ""
    const col = UNIQUE_COLUMNS.find(c => c.ids.includes(status)) ?? UNIQUE_COLUMNS[0]
    notesByStatus[col.label].push(file)
  })

  return (
    <div class="kanban-board">
      <div class="kanban-header">
        <h1>Garden Status Board</h1>
        <p class="kanban-subtitle">Evoluzione delle note per stato di maturità</p>
      </div>
      <div class="kanban-columns">
        {UNIQUE_COLUMNS.map(col => {
          const notes = notesByStatus[col.label] ?? []
          return (
            <div class="kanban-column" data-status={col.label}>
              <div class="kanban-column-header">
                <span class="kanban-emoji">{col.emoji}</span>
                <span class="kanban-column-title">{col.label}</span>
                <span class="kanban-count">{notes.length}</span>
              </div>
              <p class="kanban-column-desc">{col.description}</p>
              <div class="kanban-cards">
                {notes.length === 0 ? (
                  <div class="kanban-empty">Nessuna nota</div>
                ) : (
                  notes.map(f => (
                    <a
                      href={resolveRelative(fileData.slug!, f.slug!)}
                      class="kanban-card"
                    >
                      <span class="kanban-card-title">
                        {f.frontmatter?.title ?? f.slug}
                      </span>
                      {f.frontmatter?.tags && (f.frontmatter.tags as string[]).length > 0 && (
                        <div class="kanban-card-tags">
                          {(f.frontmatter.tags as string[]).slice(0, 2).map(t => (
                            <span class="kanban-tag">{t}</span>
                          ))}
                        </div>
                      )}
                    </a>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default (() => Kanban) satisfies QuartzComponentConstructor
