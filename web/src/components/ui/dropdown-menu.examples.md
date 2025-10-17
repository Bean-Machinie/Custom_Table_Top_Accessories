# Dropdown Menu Component - Usage Examples

## Basic Usage

```tsx
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from './dropdown-menu';

<DropdownMenuRoot>
  <DropdownMenuTrigger>
    <Button>Open Menu</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={() => console.log('New')}>New</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => console.log('Open')}>Open</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={() => console.log('Save')}>Save</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## With Icons and Descriptions

```tsx
<DropdownMenuRoot>
  <DropdownMenuTrigger>
    <Button>Actions</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem
      icon={<FileIcon />}
      description="Create a new document"
      onSelect={() => handleNew()}
    >
      New Document
    </DropdownMenuItem>
    <DropdownMenuItem
      icon={<FolderIcon />}
      description="Open an existing file"
      onSelect={() => handleOpen()}
    >
      Open File
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      icon={<SaveIcon />}
      metadata="⌘S"
      onSelect={() => handleSave()}
    >
      Save
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## With Profile/Avatar Icon (Like UserMenu)

```tsx
<DropdownMenuRoot>
  <DropdownMenuTrigger label="Open account menu">
    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/10">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-semibold">{initials}</span>
      )}
    </span>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <div className="px-3 py-2">
      <p className="font-medium">{displayName}</p>
      <p className="text-xs text-muted">{email}</p>
    </div>
    <DropdownMenuSeparator />
    <DropdownMenuItem icon={<UserIcon />} onSelect={handleProfile}>
      Profile Settings
    </DropdownMenuItem>
    <DropdownMenuItem icon={<SettingsIcon />} onSelect={handleSettings}>
      Preferences
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem icon={<LogOutIcon />} onSelect={handleSignOut}>
      Sign Out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## With Search/Filter

```tsx
<DropdownMenuRoot searchable>
  <DropdownMenuTrigger>
    <Button>Select Item</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent maxHeight={400}>
    <DropdownMenuItem onSelect={() => handleSelect('item1')}>
      Item 1
    </DropdownMenuItem>
    <DropdownMenuItem onSelect={() => handleSelect('item2')}>
      Item 2
    </DropdownMenuItem>
    {/* ...many more items */}
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## With Grouped Items

```tsx
import { DropdownMenuGroup } from './dropdown-menu';

<DropdownMenuRoot>
  <DropdownMenuTrigger>
    <Button>Edit</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuGroup label="Clipboard">
      <DropdownMenuItem icon={<CutIcon />} metadata="⌘X">Cut</DropdownMenuItem>
      <DropdownMenuItem icon={<CopyIcon />} metadata="⌘C">Copy</DropdownMenuItem>
      <DropdownMenuItem icon={<PasteIcon />} metadata="⌘V">Paste</DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuGroup label="Transform">
      <DropdownMenuItem>Uppercase</DropdownMenuItem>
      <DropdownMenuItem>Lowercase</DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## With Checkboxes

```tsx
import { DropdownMenuCheckboxItem } from './dropdown-menu';

const [showGrid, setShowGrid] = useState(true);
const [showRulers, setShowRulers] = useState(false);

<DropdownMenuRoot>
  <DropdownMenuTrigger>
    <Button>View</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuCheckboxItem
      checked={showGrid}
      onCheckedChange={setShowGrid}
      description="Display grid overlay"
    >
      Show Grid
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem
      checked={showRulers}
      onCheckedChange={setShowRulers}
      description="Display rulers"
    >
      Show Rulers
    </DropdownMenuCheckboxItem>
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## With Loading/Error States

```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

<DropdownMenuRoot>
  <DropdownMenuTrigger>
    <Button>Load Data</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent
    loading={loading}
    errorMessage={error}
    onRetry={() => handleRetry()}
    emptyMessage={!loading && !error && items.length === 0 ? "No items found" : undefined}
  >
    {items.map(item => (
      <DropdownMenuItem key={item.id} onSelect={() => handleSelect(item)}>
        {item.name}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## With Multi-Select (stays open)

```tsx
<DropdownMenuRoot closeOnSelect={false}>
  <DropdownMenuTrigger>
    <Button>Select Multiple</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuCheckboxItem checked={option1} onCheckedChange={setOption1}>
      Option 1
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem checked={option2} onCheckedChange={setOption2}>
      Option 2
    </DropdownMenuCheckboxItem>
    <DropdownMenuCheckboxItem checked={option3} onCheckedChange={setOption3}>
      Option 3
    </DropdownMenuCheckboxItem>
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## With Disabled Items

```tsx
<DropdownMenuRoot>
  <DropdownMenuTrigger>
    <Button>Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onSelect={() => handleEdit()}>Edit</DropdownMenuItem>
    <DropdownMenuItem disabled>Delete (no permission)</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => handleShare()}>Share</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenuRoot>
```

## Props Reference

### DropdownMenuRoot

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Uncontrolled default open state |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when open state changes |
| `searchable` | `boolean` | `false` | Enable search/filter input |
| `closeOnSelect` | `boolean` | `true` | Auto-close on item selection |

### DropdownMenuContent

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `align` | `'start' \| 'end'` | `'start'` | Horizontal alignment |
| `sideOffset` | `number` | `8` | Distance from trigger (px) |
| `maxHeight` | `number` | `360` | Max height before scrolling (px) |
| `loading` | `boolean` | `false` | Show loading state |
| `emptyMessage` | `string` | - | Message when no items |
| `errorMessage` | `string` | - | Error message to display |
| `onRetry` | `() => void` | - | Retry callback for errors |

### DropdownMenuItem

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `ReactNode` | - | Icon to display |
| `description` | `string` | - | Secondary description text |
| `metadata` | `ReactNode` | - | Right-aligned metadata (e.g., shortcuts) |
| `selected` | `boolean` | - | Show selection indicator |
| `disabled` | `boolean` | `false` | Disable item |
| `inset` | `boolean` | `false` | Add left padding (for alignment) |
| `onSelect` | `() => void` | - | Selection callback |

## Features

- ✅ Full keyboard navigation (Arrow keys, Home, End, PageUp, PageDown, Escape)
- ✅ Typeahead search (type to jump to items)
- ✅ Optional search field for large lists
- ✅ Smooth animations with `prefers-reduced-motion` support
- ✅ Scroll shadows for better UX
- ✅ Collision detection and auto-flip
- ✅ Focus management and accessibility
- ✅ Loading, error, and empty states
- ✅ Icons, descriptions, and metadata support
- ✅ Single and multi-select patterns
- ✅ Grouped items with headers
- ✅ Profile/avatar icon support
