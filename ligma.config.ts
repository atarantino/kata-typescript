import type { DsaName } from "./scripts/dsa";

export interface LigmaConfig {
    dsa: DsaName[];
}

// Ordered as a ramp: `scripts/due.ts` introduces unseen katas in this
// sequence, so each one leans on forms already in rotation.
const config = {
    dsa: [
        // search and the first sorts — loop invariants, nothing structural
        "LinearSearchList",
        "BinarySearchList",
        "TwoCrystalBalls",
        "BubbleSort",

        // linear structures — pointer and index bookkeeping
        "ArrayList",
        "SinglyLinkedList",
        "DoublyLinkedList",
        "Queue",
        "Stack",

        // recursion over those structures
        "QuickSort",
        "MazeSolver",

        // trees — recursive traversal, then breadth-first
        "BTPreOrder",
        "BTInOrder",
        "BTPostOrder",
        "BTBFS",
        "CompareBinaryTrees",
        "DFSOnBST",

        // composites — each needs an earlier structure to build on
        "Map",
        "LRU",
        "Trie",
        "MinHeap",

        // graphs
        "DFSGraphList",
        "BFSGraphMatrix",
    ],
} satisfies LigmaConfig;

export default config;
