import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'

import {
    getAgents,
    type AgentStatus,
} from '@/lib/api'

import type {
    Connection,
} from '@/components/game/MatchSettings'

export function useAgents() {
    const [agents, setAgents] =
        useState<AgentStatus[]>([])

    const [connection, setConnection] =
        useState<Connection>('loading')

    const requestId = useRef(0)

    const refresh = useCallback(async () => {
        const currentId = ++requestId.current

        setConnection('loading')

        try {
            const result = await getAgents()

            if (currentId !== requestId.current) {
                return
            }

            setAgents(result)
            setConnection('online')
        } catch {
            if (currentId !== requestId.current) {
                return
            }

            setAgents([])
            setConnection('offline')
        }
    }, [])

    useEffect(() => {
        void refresh()

        return () => {
            requestId.current += 1
        }
    }, [refresh])

    return {
        agents,
        connection,
        refresh,
    }
}
