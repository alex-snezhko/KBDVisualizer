import { useEffect, useState } from "react";
import { fetchFilterRanges } from "../apiInteraction";
import { Filter, ItemType, NumRangeFilter, SelectFilter } from "../types";

export default function useFilters(itemType: ItemType): [
    Filter[] | undefined,
    (fieldName: string, low: number, high: number) => void,
    (fieldName: string, option: string) => void
] {
    const [filters, setFilters] = useState<Filter[]>();

    function handleUpdateNumericFilter(fieldName: string, low: number, high: number) {
        const newFilters = [...filters!];
        const numericFilter = newFilters.find((f): f is NumRangeFilter => f.filterType === "numeric" && f.fieldName === fieldName)!;

        numericFilter.value.low = low;
        numericFilter.value.high = high;
        setFilters(newFilters);
    }

    function handleUpdateSelectionFilter(fieldName: string, option: string) {
        const newFilters = [...filters!];
        const selectionFilter = newFilters.find((f): f is SelectFilter =>
            (f.filterType === "selectionAllOf" || f.filterType === "selectionOneOf") && f.fieldName === fieldName
        )!;
        const selections = [...selectionFilter.value];
        const selection = selections.find(opt => opt.option === option)!;
        selection.selected = !selection.selected;
        selectionFilter.value = selections;
        
        setFilters(newFilters);
    }

    useEffect(() => {
        (async () => {
            const filterRanges = await fetchFilterRanges(itemType);

            // indicate that all selection options are unselected
            const filters = filterRanges.map(filter => {
                switch (filter.filterType) {
                    case "selectionOneOf":
                        return { ...filter, value: filter.value.map(option => ({ option, selected: true })) };
                    case "selectionAllOf":
                        return { ...filter, value: filter.value.map(option => ({ option, selected: false })) };
                    case "numeric":
                        return filter;
                }
            });
            setFilters(filters);
        })();
    }, [itemType]);

    return [filters, handleUpdateNumericFilter, handleUpdateSelectionFilter];
}