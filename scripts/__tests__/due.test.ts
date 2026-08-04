import { describe, expect, test } from "vitest";

import { scheduleKatas } from "../due";

const kata = (id: string, dsa: string) => ({ id, kind: "repo", dsa });

describe("scheduleKatas", () => {
    test("schedules repo katas on the drill curve", () => {
        const katas = [
            kata("a", "QuickSort"),
            kata("b", "MinHeap"),
            kata("c", "Trie"),
            kata("d", "Map"),
        ];
        const attempts = [
            // a: first instant starts at 7 days, second grows by ease
            // (7 * 2.55 = 17.85 -> 18 days)
            { kid: "a", d: "2026-01-01", r: "instant" },
            { kid: "a", d: "2026-01-08", r: "instant" },
            // b: slow has a 3-day floor even from interval 0
            { kid: "b", d: "2026-01-10", r: "slow" },
            // c: blank resets to 2 days
            { kid: "c", d: "2026-01-19", r: "blank" },
            // d: no attempts -> new
        ];

        const schedule = scheduleKatas(katas, attempts, "2026-01-20");

        expect(schedule).toEqual([
            {
                name: "MinHeap",
                due: true,
                dueDate: "2026-01-13",
                overdueDays: 7,
                status: "7d overdue",
            },
            {
                name: "Map",
                due: true,
                overdueDays: 0,
                status: "new",
            },
            {
                name: "Trie",
                due: false,
                dueDate: "2026-01-21",
                overdueDays: -1,
                status: "due 2026-01-21",
            },
            {
                name: "QuickSort",
                due: false,
                dueDate: "2026-01-26",
                overdueDays: -6,
                status: "due 2026-01-26",
            },
        ]);
    });

    test("introduces only newPerDay unseen katas, in curriculum order", () => {
        // Seeded in a jumbled order; introduced in the configured one.
        const katas = [
            kata("a", "QuickSort"),
            kata("b", "BinarySearchList"),
            kata("c", "LinearSearchList"),
            kata("d", "BubbleSort"),
        ];
        const order = [
            "LinearSearchList",
            "BinarySearchList",
            "BubbleSort",
            "QuickSort",
        ];

        const schedule = scheduleKatas(katas, [], "2026-01-20", 2, order);

        expect(schedule.map((item) => [item.name, item.status])).toEqual([
            ["LinearSearchList", "new"],
            ["BinarySearchList", "new"],
            ["BubbleSort", "queued"],
            ["QuickSort", "queued"],
        ]);
        expect(schedule.filter((item) => item.due)).toHaveLength(2);
    });

    test("katas missing from the curriculum are introduced last", () => {
        const katas = [kata("a", "RingBuffer"), kata("b", "BubbleSort")];

        const schedule = scheduleKatas(katas, [], "2026-01-20", 1, [
            "BubbleSort",
        ]);

        expect(schedule.map((item) => [item.name, item.status])).toEqual([
            ["BubbleSort", "new"],
            ["RingBuffer", "queued"],
        ]);
    });

    test("today's introductions count against the new allowance", () => {
        const katas = [
            kata("a", "LinearSearchList"),
            kata("b", "BinarySearchList"),
            kata("c", "BubbleSort"),
        ];
        // LinearSearchList was already introduced today, so only one of the
        // two remaining unseen katas may follow it.
        const attempts = [{ kid: "a", d: "2026-01-20", r: "slow" }];
        const order = ["LinearSearchList", "BinarySearchList", "BubbleSort"];

        const schedule = scheduleKatas(katas, attempts, "2026-01-20", 2, order);
        const statuses = new Map(
            schedule.map((item) => [item.name, item.status]),
        );

        expect(statuses.get("BinarySearchList")).toBe("new");
        expect(statuses.get("BubbleSort")).toBe("queued");
    });

    test("reviews still come due when the new allowance is spent", () => {
        const katas = [kata("a", "QuickSort"), kata("b", "MinHeap")];
        const attempts = [{ kid: "a", d: "2026-01-01", r: "blank" }];

        const schedule = scheduleKatas(katas, attempts, "2026-01-20", 0);

        expect(
            schedule.map((item) => [item.name, item.due, item.status]),
        ).toEqual([
            ["QuickSort", true, "17d overdue"],
            ["MinHeap", false, "queued"],
        ]);
    });

    test("caps the drill interval at 180 days", () => {
        // Intervals: 7, 18, 47, 125, then 125 * 2.7 = 338 capped to 180.
        const attempts = [
            { kid: "a", d: "2026-01-01", r: "instant" },
            { kid: "a", d: "2026-01-08", r: "instant" },
            { kid: "a", d: "2026-01-26", r: "instant" },
            { kid: "a", d: "2026-03-14", r: "instant" },
            { kid: "a", d: "2026-07-17", r: "instant" },
        ];

        const [scheduled] = scheduleKatas(
            [kata("a", "QuickSort")],
            attempts,
            "2026-07-18",
        );

        expect(scheduled.dueDate).toBe("2027-01-13");
    });

    test("a blank drops ease so later instants grow slower", () => {
        // instant: 7d, ease 2.55; blank: 2d, ease 2.30;
        // instant: 2 * 2.30 = 4.6 floored to 7 days.
        const attempts = [
            { kid: "a", d: "2026-01-01", r: "instant" },
            { kid: "a", d: "2026-01-08", r: "blank" },
            { kid: "a", d: "2026-01-10", r: "instant" },
        ];

        const [scheduled] = scheduleKatas(
            [kata("a", "QuickSort")],
            attempts,
            "2026-01-10",
        );

        expect(scheduled.dueDate).toBe("2026-01-17");
    });
});
