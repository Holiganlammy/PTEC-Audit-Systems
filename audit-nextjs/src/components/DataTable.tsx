// Version: 2.0.0 | Date: 2025-04-07 18:45:00 | Updated: เพิ่ม rowSelection และ onRowSelectionChange props

"use client"
import * as React from "react"
import {
   ColumnDef,
   ColumnFiltersState,
   flexRender,
   getCoreRowModel,
   getFilteredRowModel,
   getPaginationRowModel,
   getSortedRowModel,
   SortingState,
   useReactTable,
   VisibilityState,
   RowSelectionState,
} from "@tanstack/react-table"
import { ChevronDown, Loader2 } from "lucide-react"
import { useDebounce } from "use-debounce"
import { Skeleton } from "@/components/ui/skeleton"
import {
   ChevronLeft,
   ChevronRight,
   ChevronsLeft,
   ChevronsRight,
} from "lucide-react"
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select"

import { Button } from "@/components/ui/button"
import {
   DropdownMenu,
   DropdownMenuCheckboxItem,
   DropdownMenuContent,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table"
import { useEffect } from "react"

interface DataTableProps<TData, TValue> {
   columns: ColumnDef<TData, TValue>[]
   data: TData[]
   searchKey?: string
   searchKeys?: string[]
   searchPlaceholder?: string
   pagination?: {
      pageIndex: number
      pageSize: number
   }
   onPageChange?: (newPage: number) => void
   onPageSizeChange?: (newSize: number) => void
   Loading?: boolean
   pageCount?: number
   totalRows?: number
   onSearchChange?: (searchValue: string) => void
   searchValue?: string
   rowSelection?: RowSelectionState
   onRowSelectionChange?: (selection: RowSelectionState) => void
   rowIdKey?: string  // ชื่อ field ที่จะใช้เป็น unique id (เช่น 'jobId', 'id', 'userId')
}

export function DataTable<TData, TValue>({
   columns,
   data,
   searchKey,
   searchKeys,
   searchPlaceholder = "Search...",
   pagination,
   onPageChange,
   onPageSizeChange,
   Loading,
   pageCount,
   totalRows,
   onSearchChange,
   searchValue: controlledSearchValue,
   rowSelection: externalRowSelection,
   onRowSelectionChange: externalOnRowSelectionChange,
   rowIdKey,
}: DataTableProps<TData, TValue>) {
   const [sorting, setSorting] = React.useState<SortingState>([])
   const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
   const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
   
   // Internal row selection (ใช้เมื่อไม่มี external control)
   const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({})
   
   const [localSearchValue, setLocalSearchValue] = React.useState("")
   const isServerSideSearch = Boolean(onSearchChange && controlledSearchValue !== undefined)
   const [internalPagination, setInternalPagination] = React.useState({
      pageIndex: 0,
      pageSize: 20,
   });
   const [internalSearchValue, setInternalSearchValue] = React.useState("")
   const [debouncedInternalSearch] = useDebounce(internalSearchValue, 1000)
   const globalFilter = isServerSideSearch ? debouncedInternalSearch : localSearchValue
   const currentPagination = pagination ?? internalPagination;
   const finalSearchKeys = searchKeys || (searchKey ? [searchKey] : [])
   const isServerSidePagination = Boolean(
      pagination && 
      onPageChange && 
      onPageSizeChange && 
      pageCount !== undefined
   )

   // ตรวจสอบว่าใช้ external หรือ internal row selection
   const isExternalRowSelection = Boolean(
      externalRowSelection !== undefined && externalOnRowSelectionChange
   )
   const currentRowSelection = isExternalRowSelection 
      ? externalRowSelection 
      : internalRowSelection

   useEffect(() => {
      if (isServerSideSearch && onSearchChange) {
         onSearchChange(debouncedInternalSearch)
      }
   }, [debouncedInternalSearch, isServerSideSearch, onSearchChange])

   useEffect(() => {
      if (isServerSideSearch && controlledSearchValue === "" && internalSearchValue !== "") {
         setInternalSearchValue("")
      }
   }, [controlledSearchValue, isServerSideSearch])

   const table = useReactTable({
      data,
      columns,
      pageCount: isServerSidePagination ? pageCount : undefined,
      manualPagination: isServerSidePagination,
      manualFiltering: isServerSideSearch,
      onSortingChange: setSorting,
      onColumnFiltersChange: setColumnFilters,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: isServerSideSearch ? undefined : getFilteredRowModel(),
      onColumnVisibilityChange: setColumnVisibility,
      
      // Row selection change handler
      onRowSelectionChange: (updaterOrValue) => {
         if (isExternalRowSelection && externalOnRowSelectionChange) {
            // External control
            if (typeof updaterOrValue === 'function') {
               externalOnRowSelectionChange(updaterOrValue(currentRowSelection ?? {}))
            } else {
               externalOnRowSelectionChange(updaterOrValue)
            }
         } else {
            // Internal control
            setInternalRowSelection(updaterOrValue)
         }
      },
      
      onGlobalFilterChange: (value) => {
         if (isServerSideSearch) {
            setInternalSearchValue?.(value as string)
         } else {
            setLocalSearchValue(value as string)
         }
      },
      onPaginationChange: (updaterOrValue) => {
         if (pagination && onPageChange && onPageSizeChange) {
            if (typeof updaterOrValue === 'function') {
               const newPagination = updaterOrValue(currentPagination);
               if (newPagination.pageIndex !== currentPagination.pageIndex) {
                  onPageChange(newPagination.pageIndex);
               }
               if (newPagination.pageSize !== currentPagination.pageSize) {
                  onPageSizeChange(newPagination.pageSize);
               }
            } else {
               if (updaterOrValue.pageIndex !== currentPagination.pageIndex) {
                  onPageChange(updaterOrValue.pageIndex);
               }
               if (updaterOrValue.pageSize !== currentPagination.pageSize) {
                  onPageSizeChange(updaterOrValue.pageSize);
               }
            }
         } else {
            setInternalPagination(prev => {
               if (typeof updaterOrValue === 'function') {
                  return updaterOrValue(prev);
               }
               return updaterOrValue;
            });
         }
      },
      autoResetPageIndex: false,
      globalFilterFn: (row, columnId, filterValue) => {
         if (!filterValue || finalSearchKeys.length === 0) return true
         const searchValue = filterValue.toLowerCase()

         return finalSearchKeys.some(key => {
            const cellValue = row.getValue(key)
            return cellValue?.toString().toLowerCase().includes(searchValue)
         })
      },
      
      state: {
         sorting,
         columnFilters,
         columnVisibility,
         rowSelection: currentRowSelection,
         globalFilter,
         pagination: currentPagination,
      },
      
      enableRowSelection: true,
      
      getRowId: (row, index) => {
         // ถ้ามี rowIdKey ให้ใช้ field นั้น
         if (rowIdKey) {
            const rowData = row as Record<string, unknown>
            const id = rowData[rowIdKey]
            if (id !== undefined && id !== null) {
               return String(id)
            }
         }
         
         // ลองหา id field ทั่วไป
         const rowData = row as Record<string, unknown>
         const commonIdFields = ['id', 'jobId', 'userId', 'itemId', 'recordId']
         for (const field of commonIdFields) {
            if (rowData[field] !== undefined && rowData[field] !== null) {
               return String(rowData[field])
            }
         }
         
         // ถ้าไม่มี ใช้ index
         return String(index)
      },
   })

   const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
      const value = event.target.value
      
      if (isServerSideSearch) {
         setInternalSearchValue?.(value)
      } else {
         table.setPageIndex(0)
         if (finalSearchKeys.length > 1) {
            setLocalSearchValue(value)
         } else if (finalSearchKeys.length === 1) {
            table.getColumn(finalSearchKeys[0])?.setFilterValue(value)
         }
      }
   }
   
   const handleColumnVisibilityChange = (value: boolean, columnId: string): void => {
      table.getColumn(columnId)?.toggleVisibility(!!value)
   }
   
   const shouldShowSearch = finalSearchKeys.length > 0

   const displayedRowsCount = isServerSidePagination 
      ? Math.min(data.length, currentPagination.pageSize)
      : table.getFilteredRowModel().rows.length

   const totalRowsCount = isServerSidePagination 
      ? (totalRows || 0)
      : table.getFilteredRowModel().rows.length

   return (
      <div className="w-full min-w-0">
         <div className="flex justify-between items-center py-4">
            {shouldShowSearch && (
               <Input
                  placeholder={searchPlaceholder}
                  value={
                     isServerSideSearch
                        ? internalSearchValue
                        : finalSearchKeys.length > 1
                           ? globalFilter
                           : (table.getColumn(finalSearchKeys[0])?.getFilterValue() as string) ?? ""
                  }
                  onChange={handleSearchChange}
                  className="max-w-sm"
                  disabled={Loading}
               />
            )}
            <div className="flex items-center space-x-2">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="outline" className="ml-auto" disabled={Loading}>
                        Show Columns <ChevronDown />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     {table
                        .getAllColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => {
                           return (
                              <DropdownMenuCheckboxItem
                                 key={column.id}
                                 className="capitalize"
                                 checked={column.getIsVisible()}
                                 onCheckedChange={(value: boolean) =>
                                    handleColumnVisibilityChange(value, column.id)
                                 }
                              >
                                 {column.id}
                              </DropdownMenuCheckboxItem>
                           )
                        })}
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>

         <div className="relative overflow-x-auto">
            <Table>
               <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                     <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => {
                           return (
                              <TableHead key={header.id}>
                                 {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                       header.column.columnDef.header,
                                       header.getContext()
                                    )}
                              </TableHead>
                           )
                        })}
                     </TableRow>
                  ))}
               </TableHeader>
               <TableBody>
                  {Loading ? (
                     Array.from({ length: table.getState().pagination.pageSize }).map((_, i) => (
                        <TableRow key={i}>
                           {columns.map((_, cellIndex) => (
                              <TableCell key={cellIndex} className="py-4">
                                 <Skeleton className="h-4 w-full" />
                              </TableCell>
                           ))}
                        </TableRow>
                     ))
                  ) : table.getRowModel().rows?.length ? (
                     table.getRowModel().rows.map((row) => (
                        <TableRow
                           key={row.id}
                           data-state={row.getIsSelected() && "selected"}
                        >
                           {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                 {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                 )}
                              </TableCell>
                           ))}
                        </TableRow>
                     ))
                  ) : (
                     <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                           No results.
                        </TableCell>
                     </TableRow>
                  )}
               </TableBody>
            </Table>

            {Loading && (
               <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
            )}
         </div>

         <div className="sm:flex items-center justify-between px-2 pt-4">
            <div className="text-muted-foreground sm:flex-1 text-sm sm:ml-4 my-2">
               {isServerSidePagination ? (
                  <>
                     Showing {currentPagination.pageIndex * currentPagination.pageSize + 1} to{" "}
                     {Math.min(
                        (currentPagination.pageIndex + 1) * currentPagination.pageSize,
                        totalRowsCount
                     )}{" "}
                     of {totalRowsCount.toLocaleString()} row(s)
                  </>
               ) : (
                  <>
                     {table.getFilteredSelectedRowModel().rows.length} of{" "}
                     {table.getFilteredRowModel().rows.length} row(s) selected.
                  </>
               )}
            </div>
            
            <div className="grid grid-cols-2 sm:flex items-center space-x-0 sm:space-x-6 lg:space-x-8 mr-4 gap-2 sm:gap-0">
               <div className="flex items-center space-x-2 order-1 sm:order-none">
                  <p className="text-xs sm:text-sm font-medium hidden sm:block">Rows per page</p>
                  <p className="text-xs sm:text-sm font-medium sm:hidden">Rows</p>
                  <Select
                     value={`${table.getState().pagination.pageSize}`}
                     onValueChange={(value) => {
                        table.setPageSize(Number(value))
                     }}
                     disabled={Loading}
                  >
                     <SelectTrigger className="h-8 w-full sm:w-[70px]">
                        <SelectValue placeholder={table.getState().pagination.pageSize} />
                     </SelectTrigger>
                     <SelectContent side="top">
                        {[20, 50, 100].map((pageSize) => (
                           <SelectItem key={pageSize} value={`${pageSize}`}>
                              {pageSize}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>

               <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                  Page {table.getState().pagination.pageIndex + 1} of{" "}
                  {isServerSidePagination ? pageCount : table.getPageCount()}
               </div>

               <div className="flex items-center justify-center space-x-1 sm:space-x-2 col-span-2 sm:col-span-1 order-3 sm:order-none">
                  <Button
                     variant="outline"
                     size="icon"
                     className="hidden size-8 lg:flex"
                     onClick={() => table.setPageIndex(0)}
                     disabled={!table.getCanPreviousPage() || Loading}
                  >
                     <span className="sr-only">Go to first page</span>
                     <ChevronsLeft className="size-4" />
                  </Button>
                  <Button
                     variant="outline"
                     size="icon"
                     className="size-8"
                     onClick={() => table.previousPage()}
                     disabled={!table.getCanPreviousPage() || Loading}
                  >
                     <span className="sr-only">Go to previous page</span>
                     <ChevronLeft className="size-4" />
                  </Button>

                  <div className="flex sm:hidden items-center space-x-1">
                     {(() => {
                        const currentPage = table.getState().pagination.pageIndex;
                        const totalPages = isServerSidePagination ? (pageCount || 0) : table.getPageCount();
                        const pages = [];

                        let start = Math.max(0, currentPage - 1);
                        let end = Math.min(totalPages - 1, currentPage + 1);

                        if (end - start < 2) {
                           if (start === 0) {
                              end = Math.min(totalPages - 1, start + 2);
                           } else if (end === totalPages - 1) {
                              start = Math.max(0, end - 2);
                           }
                        }

                        for (let i = start; i <= end; i++) {
                           pages.push(
                              <Button
                                 key={i}
                                 variant={i === currentPage ? "default" : "outline"}
                                 size="icon"
                                 className="size-7 text-xs"
                                 onClick={() => table.setPageIndex(i)}
                                 disabled={Loading}
                              >
                                 {i + 1}
                              </Button>
                           );
                        }

                        return pages;
                     })()}
                  </div>

                  <Button
                     variant="outline"
                     size="icon"
                     className="size-8"
                     onClick={() => table.nextPage()}
                     disabled={!table.getCanNextPage() || Loading}
                  >
                     <span className="sr-only">Go to next page</span>
                     <ChevronRight className="size-4" />
                  </Button>
                  <Button
                     variant="outline"
                     size="icon"
                     className="hidden size-8 lg:flex"
                     onClick={() => table.setPageIndex((isServerSidePagination ? (pageCount || 1) : table.getPageCount()) - 1)}
                     disabled={!table.getCanNextPage() || Loading}
                  >
                     <span className="sr-only">Go to last page</span>
                     <ChevronsRight className="size-4" />
                  </Button>
               </div>
            </div>
         </div>
      </div>
   )
}